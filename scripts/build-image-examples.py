#!/usr/bin/env python3
"""Deterministic, self-contained demo .xtemplate ZIPs, using only stdlib.
No third-party imagery, downloaded photos, network access or extra packages.
Run from any platform: python3 scripts/build-image-examples.py
"""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo
import json, math, struct, zlib

BASE=Path(__file__).resolve().parent.parent/'examples'

def png(width,height,pixel):
    def chunk(kind,data):
        return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    compressor=zlib.compressobj(9)
    parts=[]
    for y in range(height):
        line=bytearray([0])
        for x in range(width):
            line.extend(max(0,min(255,int(v))) for v in pixel(x/width,y/height))
        parts.append(compressor.compress(bytes(line)))
    parts.append(compressor.flush())
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',width,height,8,6,0,0,0))+chunk(b'IDAT',b''.join(parts))+chunk(b'IEND',b'')

def clamp(x,a=0,b=1):return max(a,min(b,x))
def lerp(a,b,t):return a+(b-a)*clamp(t)
def mix(a,b,t):return tuple(lerp(a[i],b[i],t) for i in range(3))
def blend(c1,c2,a):return mix(c1,c2,a)

def aurora(x,y):
    sky=mix((7,16,43),(23,35,67),y)
    star=math.sin(7919*x+1747*y)*math.sin(2921*x-5297*y)
    if star>.997:sky=blend(sky,(192,220,244),clamp((star-.997)/.003)*.95)
    wave1=.20+.20*x+.036*math.sin(x*18)+.018*math.sin(x*44)
    wave2=.43-.21*x+.04*math.sin(x*13+2)
    cyan=math.exp(-((y-wave1)/(.072+.035*x))**2)
    purple=math.exp(-((y-wave2)/.10)**2)
    sky=blend(sky,(19,175,152),cyan*.75*(1-y*.3))
    sky=blend(sky,(111,91,220),purple*.65)
    horizon=.81+.017*math.sin(x*14)+.01*math.sin(x*52)
    if y>horizon:sky=blend(sky,(7,17,37),clamp((y-horizon)*35))
    if y>.9:sky=blend(sky,(14,23,49),.22)
    return (*sky,255)

def parchment(x,y):
    grain=(math.sin(x*1743+y*735)*math.sin(x*3183-y*1631))*.5
    color=(247+grain*6,242+grain*5,232+grain*6)
    a=math.exp(-((x-.91)**2/.17+(y-.17)**2/.07))
    b=math.exp(-((x-.08)**2/.08+(y-.82)**2/.08))
    color=blend(color,(217,226,216),a*.75)
    color=blend(color,(240,216,200),b*.54)
    if abs((x-.15)+.33*(y-.56))<.025 and .09<y<.50:color=blend(color,(137,169,160),.26)
    if abs((x-.82)-.20*(y-.42))<.022 and .24<y<.70:color=blend(color,(173,142,124),.22)
    return (*color,255)

def watermark(x,y):
    # Transparent technical diagram: compass circles, fine linework and a dot lattice.
    sx=(x-.5)*1.6;sy=(y-.5)*2.2
    radius=math.hypot(sx,sy)
    ring=min(abs(radius-.49),abs(radius-.38),abs(radius-.27))<.004
    axis=abs(sx)<.0025 or abs(sy)<.0025
    diagonal=abs(abs(sx)-abs(sy))<.003 and abs(sx)<.58
    radial=abs((math.atan2(sy,sx)*8/math.pi)%1)<.016 and .38<radius<.52
    pattern=ring or diagonal or radial or (axis and radius<.60)
    alpha=235 if pattern else 0
    if (int(x*27)%7==0 and int(y*27)%7==0 and radius<.54):alpha=max(alpha,75)
    return (67,107,119,alpha)

def title(x,y,s,size=5,color='#192d49',**kw):return {'type':'text','x':f'{x}mm','y':f'{y}mm','text':s,'size':f'{size}mm','fill':color,**kw}
def line(x,y,x2,y2,color='#aec8c8',width='.35mm'):
    return {'type':'line','x1':f'{x}mm','y1':f'{y}mm','x2':f'{x2}mm','y2':f'{y2}mm','stroke':color,'strokeWidth':width}

def write(name,document,assets):
    data=json.dumps(document,ensure_ascii=False,indent=2).encode()+b'\n'
    filename=BASE/name
    with ZipFile(filename,'w',ZIP_DEFLATED,compresslevel=9) as archive:
        for name,contents in [('template.json',data),*sorted(assets.items())]:
            info=ZipInfo(name,(2026,1,1,0,0,0))
            info.compress_type=ZIP_DEFLATED
            info.external_attr=0o644<<16
            archive.writestr(info,contents,compress_type=ZIP_DEFLATED,compresslevel=9)
    print(name,len(data),'JSON bytes',filename.stat().st_size,'package bytes')

cover1={
 'xtemplate':1,'id':'studio.examples.aurora-atlas','name':'Aurora Atlas — Image Cover','kind':'cover',
 'description':'Image-backed, full-bleed midnight cover with title, editable labels and colour variables.',
 'author':'XTemplate Studio','license':'MIT','tags':['cover','image','photographic','creative'],
 'params':{'highlight':{'type':'color','label':'Highlight','default':'#a7efdf'}},
 'items':[
  {'type':'image','src':'images/aurora.png','x':'0mm','y':'0mm','w':'100%','h':'100%','fit':'cover','position':'center'},
  {'type':'rect','x':'19mm','y':'80mm','w':'172mm','h':'1mm','fill':'highlight','stroke':'none'},
  title(19,43,'XNOTES',4,'#d3eceb',weight='bold'),
  title(19,111,'AURORA',17,'#ffffff',weight='bold'),
  title(19,133,'ATLAS',17,'#a7efdf',weight='bold'),
  title(20,149,'IDEAS   /   DISCOVERY   /   NOTES',3.4,'#eff8f4'),
  line(19,157,191,157,'#7ca6c2','0.5mm'),
  title(20,267,'NAME:',4.5,'#d5ebf0'),line(45,269,190,269,'#bfd3d8'),
  title(20,280,'VOLUME  01    —    2026',3.5,'#c7dedc')
 ]}
write('cover-aurora-atlas.xtemplate',cover1,{'images/aurora.png':png(570,806,aurora)})

cover2={
 'xtemplate':1,'id':'studio.examples.field-notes','name':'Field Notes — Editorial Cover','kind':'cover',
 'description':'Soft textured cover built from an embedded image plus editable vector labels.',
 'author':'XTemplate Studio','license':'MIT','tags':['cover','image','journal','study'],
 'params':{'titleInk':{'type':'color','label':'Heading colour','default':'#2a5760'}},
 'items':[
  {'type':'image','src':'images/paper.png','x':'0mm','y':'0mm','w':'100%','h':'100%','fit':'cover'},
  {'type':'rect','x':'13mm','y':'13mm','w':'184mm','h':'271mm','fill':'none','stroke':'#9aaea9','strokeWidth':'0.42mm'},
  {'type':'rect','x':'25mm','y':'75mm','w':'161mm','h':'2mm','fill':'#af8585','stroke':'none'},
  title(25,59,'FIELD',16,'titleInk',weight='bold'),title(25,95,'NOTES',20,'titleInk',weight='bold'),
  title(25,111,'RESEARCH   /   STUDY   /   OBSERVE',3.8,'#55747a'),
  title(25,154,'SUBJECT',4,'#49636c',weight='bold'),line(25,164,181,164,'#7c9c9a','0.4mm'),
  title(25,192,'AUTHOR',4,'#49636c',weight='bold'),line(25,203,181,203,'#7c9c9a','0.4mm'),
  title(25,270,'STUDIO  /  002',4,'#55747a')
 ]}
write('cover-field-notes.xtemplate',cover2,{'images/paper.png':png(490,700,parchment)})

page={
 'xtemplate':1,'id':'studio.examples.study-watermark','name':'Study Notes — Watermark Page','kind':'page',
 'description':'A study page combining lined notes, metadata and a low-opacity centered image watermark.',
 'author':'XTemplate Studio','license':'MIT','tags':['page','study','watermark','ruled'],
 'params':{'lineAccent':{'type':'color','default':'#386b7b','label':'Section colour'},'spacing':{'type':'length','default':'9mm','min':'6mm','max':'14mm','label':'Line spacing','role':'spacing'}},
 'items':[
  {'type':'image','src':'images/compass.png','x':'28mm','y':'70mm','w':'154mm','h':'174mm','fit':'contain','position':'center','opacity':0.23},
  title(16,19,'STUDY NOTES',8,'lineAccent',weight='bold'),
  title(16,29,'SUBJECT:',3.5,'#4d6e76'),line(41,29,112,29,'#7e9e9f'),
  title(119,29,'DATE:',3.5,'#4d6e76'),line(136,29,194,29,'#7e9e9f'),
  line(16,37,194,37,'lineAccent','0.65mm'),
  {'type':'group','x':'16mm','y':'44mm','w':'178mm','h':'221mm','children':[
   {'type':'repeat','axis':'y','period':'spacing','fit':'repeat','children':[{'type':'hline','y':'100%','stroke':'#b4cbca','strokeWidth':'0.24mm'}]}
  ]},
  title(16,280,'SUMMARY:',3.6,'#386b7b',weight='bold'),line(45,281,194,281,'#91b0b2','0.35mm')
 ]}
write('study-watermark.xtemplate',page,{'images/compass.png':png(390,560,watermark)})
