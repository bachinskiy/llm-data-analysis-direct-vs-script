"""Validate saved E2 data and usage offline. Python 3.10+, standard library."""
import csv
import json
import math
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parent
def read(p): return json.loads((ROOT/p).read_text(encoding='utf-8-sig'))
rates=read('pricing.json')['usd_per_million']

def normalized(u):
    return {'input_tokens':u['input_tokens'],'output_tokens':u['output_tokens'],
        'cached_input_tokens':u.get('cached_input_tokens',u.get('input_tokens_details',{}).get('cached_tokens',0)),
        'cache_write_input_tokens':u.get('cache_write_input_tokens',u.get('input_tokens_details',{}).get('cache_write_tokens',0)),
        'total_tokens':u.get('total_tokens',u['input_tokens']+u['output_tokens'])}

def price(u):
    u=normalized(u)
    i,h,w,o=(u[k] for k in ['input_tokens','cached_input_tokens','cache_write_input_tokens','output_tokens'])
    assert 0<=h+w<=i and u['total_tokens']==i+o
    return ((i-h-w)*rates['input']+h*rates['cached_input']+w*rates['cache_write_input']+o*rates['output'])/1e6

def integer(value,pattern):
    if not isinstance(value,str) or re.fullmatch(pattern,value) is None: return None
    return int(value.replace(',','') or '0')

FIELDS=['raw_id','report_year','track_type','severity_class','valid_damage_usd','valid_injured','valid_hazmat']
def expected(r):
    d=integer(r['damage_text'],r'[0-9,]+')
    i=integer(r['injured_text'],r'[0-9]+')
    h=integer(r['hazmat_released_text'],r'[0-9]+')
    if None in (d,i,h): level='unknown'
    elif i>0 or h>0 or d>=1000000: level='critical'
    elif d>=100000: level='high'
    elif d>=10000: level='medium'
    else: level='low'
    return dict(zip(FIELDS,['' if v is None else str(v) for v in [r['raw_id'],r['report_year'],r['track_type'],level,d,i,h]]))

def main():
    table=[]
    for n in [250,1000]:
        source=read(f'{n}/input.json')
        assert len(source)==n and len({r['raw_id'] for r in source})==n
        reference=[expected(r) for r in source]
        for m in ['m2','m3','m4']:
            for mode in ['direct','script']:
                folder=f'{n}/{m}-{mode}'
                with (ROOT/folder/'result.csv').open(encoding='utf-8-sig',newline='') as f:
                    reader=csv.DictReader(f)
                    actual=list(reader)
                    assert reader.fieldnames==FIELDS,folder+' header'
                assert actual==reference,folder+' row mismatch'
                metrics=read(folder+'/metrics.json'); evidence=read(folder+'/usage_evidence.json')
                stages=['transformation']+(['interpretation'] if n==1000 else [])
                tokens=0; usd=0
                for stage in stages:
                    metric=metrics[stage]
                    assert normalized(metric['usage'])==normalized(evidence[stage]['usage']),folder+' '+stage+' usage mismatch'
                    amount=price(metric['usage'])
                    assert math.isclose(amount,metric['usd'],rel_tol=0,abs_tol=1e-8),folder+' USD mismatch'
                    tokens+=normalized(metric['usage'])['total_tokens']; usd+=amount
                table.append({'rows':n,'method':m.upper(),'mode':mode,'boundary':'transformation' if n==250 else 'transformation+interpretation',
                              'tokens':tokens,'normalized_usd':round(usd,8),'row_mismatches':0})
                print(f'PASS {folder}: {n} rows, 7 fields; usage and price match')
    with (ROOT/'results.csv').open('w',encoding='utf-8',newline='') as f:
        writer=csv.DictWriter(f,fieldnames=list(table[0])); writer.writeheader(); writer.writerows(table)
    print('PASS: all 12 outputs. results.csv recalculated. No API calls; generated programs were not executed.')

if __name__=='__main__': main()
