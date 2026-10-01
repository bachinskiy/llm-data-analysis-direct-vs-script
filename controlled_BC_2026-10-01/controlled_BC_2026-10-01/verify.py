"""Verify saved values and usage; optionally execute saved JS modules offline."""
import argparse
import csv
import gzip
import io
import json
import re
import statistics
import subprocess
import tempfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent
FIELDS=['raw_id','report_year','track_type','severity_class','valid_damage_usd','valid_injured','valid_hazmat']
COUNTERS=['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens','reasoning_output_tokens','total_tokens']

def load(p):return json.loads(p.read_text(encoding='utf-8-sig'))

def damage(s):
    if not isinstance(s,str) or not s:return None
    if ',' not in s:
        ok=s=='0' or (s[0] in '123456789' and all('0'<=c<='9' for c in s))
    else:
        parts=s.split(',')
        ok=(1<=len(parts[0])<=3 and parts[0][0] in '123456789' and all('0'<=c<='9' for c in parts[0]) and all(len(p)==3 and all('0'<=c<='9' for c in p) for p in parts[1:]))
    return int(s.replace(',','')) if ok else None

def digits(s):return int(s) if isinstance(s,str) and s and all('0'<=c<='9' for c in s) else None

def reference(r):
    d,i,h=damage(r['damage_text']),digits(r['injured_text']),digits(r['hazmat_released_text'])
    level='unknown' if None in (d,i,h) else 'critical' if i>0 or h>0 or d>=1000000 else 'high' if d>=100000 else 'medium' if d>=10000 else 'low'
    return dict(zip(FIELDS,[r['raw_id'],r['report_year'],r['track_type'],level,d,i,h]))

def read_csv(p):
    opener=gzip.open if p.suffix=='.gz' else open
    with opener(p,'rt',encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);assert reader.fieldnames==FIELDS,(p,'header')
        rows=[]
        for r in reader:
            assert None not in r,(p,'extra cells')
            r['raw_id']=int(r['raw_id'])
            for k in FIELDS[4:]:
                x=r[k];assert x=='' or re.fullmatch(r'[0-9]+|[1-9][0-9]{0,2}(?:,[0-9]{3})+',x),(p,x)
                r[k]=int(x.replace(',','')) if x else None
            rows.append(r)
        return rows

def normalize(evidence):
    out=dict.fromkeys(COUNTERS,0)
    for e in evidence['events']:
        u=e['usage']
        if e['event_type']=='responses.usage':
            u={'input_tokens':u['input_tokens'],'cached_input_tokens':u.get('input_tokens_details',{}).get('cached_tokens',0),'cache_write_input_tokens':u.get('input_tokens_details',{}).get('cache_write_tokens',0),'output_tokens':u['output_tokens'],'reasoning_output_tokens':u.get('output_tokens_details',{}).get('reasoning_tokens',0),'total_tokens':u['total_tokens']}
        for k in COUNTERS:out[k]+=u.get(k,0)
    if not out['total_tokens']:out['total_tokens']=out['input_tokens']+out['output_tokens']
    return out

def check_model_output(folder, actual):
    text=(folder/'model_output.txt').read_text(encoding='utf-8-sig').strip()
    if (folder/'generated.js').exists():
        if text.startswith('{'):source=json.loads(text)['source_code']
        else:
            match=re.search(r'```(?:javascript|js)\s*\n([\s\S]*?)```',text)
            assert match,folder
            source=match.group(1)
        saved=(folder/'generated.js').read_text(encoding='utf-8-sig')
        # Historical M2 exports collapsed formatting whitespace; replay checks behavior.
        assert re.sub(r'\s+','',source)==re.sub(r'\s+','',saved),(folder,'code differs beyond whitespace')
        return
    if text.startswith('{'):
        assert json.loads(text)['records']==actual,(folder,'JSON answer differs from saved CSV')
    else:
        match=re.search(r'```csv\s*\n([\s\S]*?)```',text)
        data=match.group(1) if match else text
        records=list(csv.DictReader(io.StringIO(data.strip())))
        for r in records:
            r['raw_id']=int(r['raw_id'])
            for k in FIELDS[4:]:r[k]=int(r[k].replace(',','')) if r[k] else None
        assert records==actual,(folder,'CSV answer differs from saved CSV')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--replay-scripts',action='store_true');parser.add_argument('--node',default='node');parser.add_argument('--report',default=None);args=parser.parse_args()
    registry=load(ROOT/'runs.json');rates=load(ROOT/'pricing.json')['usd_per_million']
    expected={}
    for name in ['B','C']:
        with gzip.open(ROOT/name/'input.jsonl.gz','rt',encoding='utf-8') as f:expected[name]=[reference(json.loads(l)) for l in f if l.strip()]
    assert len(expected['B'])==1000 and len(expected['C'])==215849
    findings=[]
    for run in registry:
        folder=ROOT/run['path'];series=run['series']
        actual=read_csv(ROOT/run['result'])
        assert actual==expected[series],run['id']+' saved CSV does not match independent reference'
        check_model_output(folder,actual)
        u=normalize(load(folder/'usage_evidence.json'));m=load(folder/'metrics.json')
        assert u==m['usage'],run['id']+' usage mismatch'
        assert u['input_tokens']+u['output_tokens']==u['total_tokens']
        i,h,w,o=[u[k] for k in ['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens']]
        assert 0<=h+w<=i
        cost=((i-h-w)*rates['input']+h*rates['cache_read']+w*rates['cache_write']+o*rates['output'])/1e6
        assert abs(cost-m['normalized_usd'])<1e-7,(run['id'],cost)
        replay=None
        if args.replay_scripts and (folder/'generated.js').exists():
            with tempfile.TemporaryDirectory() as tmp:
                path=Path(tmp)/'replayed.jsonl'
                subprocess.run([args.node,str(ROOT/'replay.js'),str(ROOT/series/'input.jsonl.gz'),str(folder/'generated.js'),str(path)],check=True,capture_output=True,text=True,timeout=120)
                with path.open(encoding='utf-8') as f:result=[json.loads(l) for l in f if l.strip()]
                assert result==actual,run['id']+' replay mismatch'
                replay=True
        findings.append({'id':run['id'],'rows':len(actual),'mismatches':0,'usage_verified':True,'normalized_usd':round(cost,8),'script_replayed':replay})
        print(run['id']+': rows/values/usage OK'+('; generated program OK' if replay else ''))
    with (ROOT/'results.csv').open(encoding='utf-8-sig',newline='') as f:
        summaries=list(csv.DictReader(f))
    assert len(summaries)==len(findings)
    for row,run in zip(summaries,registry):
        assert row['id']==run['id']
        m=load(ROOT/run['path']/'metrics.json')
        assert abs(float(row['normalized_usd'])-m['normalized_usd'])<1e-7
        assert int(row['total_tokens'])==m['usage']['total_tokens']
    report={'runs':findings,'saved_outputs_passed':len(findings),'generated_programs_replayed':sum(x['script_replayed'] is True for x in findings),'scope':'Offline artifact and usage consistency; does not prove provider billing, universal correctness, or compliance with Direct restrictions. See protocol.md and tool traces.'}
    if args.report:Path(args.report).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='runs'},indent=2))

if __name__=='__main__':main()
