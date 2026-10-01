"""Post hoc diagnostic on synthetic rows; not a new model trial or performance sample."""
import argparse
import gzip
import json
import subprocess
import tempfile
from pathlib import Path
from verify import ROOT, load, reference

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--node',default='node');args=parser.parse_args()
    values=['0','9999','10000','99999','100000','999999','1000000','1,000,000','001','0,123','01,000',',','1,00',' 100','-1',None]
    rows=[{'raw_id':i+1,'report_year':'2022','track_type':'Main','damage_text':x,'injured_text':'0','hazmat_released_text':'0'} for i,x in enumerate(values)]
    rows.extend([dict(rows[0],raw_id=17,injured_text='1'),dict(rows[0],raw_id=18,hazmat_released_text='1'),dict(rows[0],raw_id=19,injured_text=''),dict(rows[0],raw_id=20,damage_text=None,injured_text='1')])
    expected=[reference(r) for r in rows];out=[]
    with tempfile.TemporaryDirectory() as tmp:
        tmp=Path(tmp);source=tmp/'input.jsonl.gz'
        with gzip.open(source,'wt',encoding='utf8') as f:
            for r in rows:f.write(json.dumps(r)+'\n')
        for run in load(ROOT/'runs.json'):
            script=ROOT/run['path']/'generated.js'
            if not script.exists():continue
            target=tmp/'result.jsonl'
            subprocess.run([args.node,str(ROOT/'replay.js'),str(source),str(script),str(target)],check=True,capture_output=True,timeout=30)
            actual=[json.loads(l) for l in target.read_text().splitlines()]
            differences=[{'input':r,'reference':e,'script':a} for r,e,a in zip(rows,expected,actual) if e!=a]
            out.append({'id':run['id'],'tested':len(rows),'differences':differences})
    report={'scope':'Post hoc synthetic contract diagnostic. Not included in model tokens, main sample accuracy, or trial counts. The natural-language prompts did not explicitly disallow leading zeros, whereas the historical reference did. Disagreement therefore exposes a contract ambiguity, not demonstrated damage to the retained real data.','runs':out}
    (ROOT/'edge_case_diagnostic.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8')
    print(json.dumps([{'id':x['id'],'differences':len(x['differences'])} for x in out],indent=2))

if __name__=='__main__':main()
