import numpy as np, wave

sr=44100; BPM=120; beat=60.0/BPM; bar=beat*4; DUR=26.4
N=int(sr*DUR); mono=np.zeros(N)

def place(sig,t,buf=None):
    if buf is None: buf=mono
    i=int(t*sr); j=min(len(buf),i+len(sig))
    if i<len(buf): buf[i:j]+=sig[:j-i]

def eenv(n,dec):
    t=np.arange(n)/sr; return np.exp(-t*dec)

# ---- drums ----
def kick(v=1.0):
    n=int(sr*0.34); t=np.arange(n)/sr
    f=46+115*np.exp(-t*33); ph=2*np.pi*np.cumsum(f)/sr
    s=np.sin(ph)*np.exp(-t*8.5); s[:200]+=np.linspace(1,0,200)*0.55
    return s*v
def hat(op=False,v=1.0):
    n=int(sr*(0.12 if op else 0.04)); nz=np.diff(np.random.randn(n),prepend=0)
    return nz*eenv(n,20 if op else 65)*0.5*v
def clap(v=1.0):
    n=int(sr*0.18); nz=np.diff(np.random.randn(n),prepend=0); out=nz*eenv(n,28)
    for off in (0.008,0.017):
        s=int(off*sr); tmp=np.zeros(n); tmp[s:]=(nz*eenv(n,30))[:n-s]; out+=tmp
    return out*0.42*v
def crash(v=1.0):
    n=int(sr*1.3); return np.random.randn(n)*eenv(n,3.4)*0.28*v
def boom():
    n=int(sr*0.9); t=np.arange(n)/sr
    f=68*np.exp(-t*6)+38; s=np.sin(2*np.pi*np.cumsum(f)/sr)*np.exp(-t*3.0)
    s[:300]+=np.linspace(1,0,300)*0.6; return s*1.0
def riser(d):
    n=int(sr*d); t=np.arange(n)/sr; env=(t/d)**2
    f=200+2200*(t/d); return (np.random.randn(n)*0.22+np.sin(2*np.pi*np.cumsum(f)/sr)*0.3)*env

# ---- tonal ----
def saw(f,n): t=np.arange(n)/sr; return 2*(f*t-np.floor(0.5+f*t))
def bass(f,d,v=1.0):
    n=int(sr*d); t=np.arange(n)/sr
    s=0.6*saw(f,n)+0.4*np.sin(2*np.pi*f*t)
    env=np.ones(n); a=int(0.005*sr); env[:a]=np.linspace(0,1,a); env*=np.exp(-t*4.5)
    return np.convolve(s,np.ones(8)/8,mode='same')*env*v
def pluck(f,d,v=1.0):
    n=int(sr*d); t=np.arange(n)/sr
    s=np.sin(2*np.pi*f*t)+0.45*np.sin(4*np.pi*f*t)+0.2*np.sin(6*np.pi*f*t)
    env=np.ones(n); a=int(0.003*sr); env[:a]=np.linspace(0,1,a); env*=np.exp(-t*6.5)
    return s*env*v
def lead(f,d,v=1.0):
    n=int(sr*d); t=np.arange(n)/sr
    vib=1+0.006*np.sin(2*np.pi*5.5*t)
    s=0.55*saw(f*vib,n)+0.45*np.sin(2*np.pi*f*vib*t)
    a=int(0.004*sr); r=int(0.05*sr); env=np.ones(n)
    env[:a]=np.linspace(0,1,a); env[-r:]=np.linspace(1,0,r); env*=(0.55+0.45*np.exp(-t*2.2))
    return s*env*v
def pad(f,d,v=1.0):
    n=int(sr*d); t=np.arange(n)/sr
    s=np.sin(2*np.pi*f*t)+0.5*np.sin(2*np.pi*f*1.5*t)
    a=int(0.04*sr); r=int(0.08*sr); env=np.ones(n)
    env[:a]=np.linspace(0,1,a); env[-r:]=np.linspace(1,0,r)
    return s*env*v

NOTE={'A2':110,'F2':87.31,'C3':130.81,'G2':98,'A3':220,'C4':261.63,'E4':329.63,
      'F3':174.61,'G3':196,'A4':440,'B4':493.88,'C5':523.25,'D5':587.33,'E5':659.25,
      'F5':698.46,'G5':783.99,'A5':880,'B5':987.77,'C6':1046.5,'E3':164.81}
# Am - F - C - G
prog=[('A2',['A3','C4','E4'],['A3','C4','E4','A4']),
      ('F2',['F3','A3','C4'],['F3','A3','C4','F4'.replace('F4','F3')]),
      ('C3',['C4','E4','G3'],['C4','E4','G3','C4']),
      ('G2',['G3','B4','D5'],['G3','B4','D5','G3'])]
# catchy topline over the 4-bar loop (beat, note, dur_beats)
topline=[(0,'C5',1),(1,'E5',1),(2,'A5',1.8),
         (4,'C5',1),(5,'F5',1),(6,'A5',1.8),
         (8,'E5',1),(9,'G5',1),(10,'C6',1.8),
         (12,'D5',1),(13,'G5',1),(14,'B5',1.8)]

nbars=int(DUR/bar)+1
lead_buf=np.zeros(N); arp_buf=np.zeros(N); pad_buf=np.zeros(N); bass_buf=np.zeros(N)

for b in range(nbars):
    t0=b*bar; root,chord,arp=prog[b%4]; rf=NOTE[root]
    full=b>=2; verylight=b<2
    # drums
    for k in range(4):
        if full or k==0: place(kick(1.0 if k==0 else 0.9),t0+k*beat)
    if full:
        place(clap(),t0+beat); place(clap(),t0+3*beat)
    for h in range(8):
        if full or h%2==1: place(hat(op=(h%4==3),v=0.85 if h%2 else 0.55),t0+h*0.5*beat)
    # bass
    if full:
        for h in range(8):
            f=rf*(2 if h%4==2 else 1); place(bass(f,0.24,0.95),t0+h*0.5*beat,bass_buf)
    # pad (sustained chord)
    for c in chord:
        place(pad(NOTE[c]/2,bar*0.98,0.16 if full else 0.10),t0,pad_buf)
    # arp 16ths
    for s16 in range(8):
        f=NOTE[arp[s16%len(arp)]]; place(pluck(f,0.22,0.45 if full else 0.28),t0+s16*0.5*beat,arp_buf)

# lead melody (only when full, from bar 2; also a teaser pluck in intro)
for b in range(2,nbars):
    t0=b*bar
    for (bp,note,d) in topline:
        place(lead(NOTE[note],d*beat*0.95,0.5),t0+bp*beat,lead_buf)

# mix buses with relative levels
mix=mono*1.0 + bass_buf*0.85 + arp_buf*0.7 + pad_buf*0.5 + lead_buf*0.75

# pump (sidechain) on melodic buses for energy
pump=np.ones(N)
for b in range(nbars):
    for k in range(4):
        i=int((b*bar+k*beat)*sr)
        if i<N:
            seg=min(N-i,int(0.42*sr)); tt=np.arange(seg)/sr
            pump[i:i+seg]=np.minimum(pump[i:i+seg],0.5+0.5*(1-np.exp(-tt*9)))
melodic=(bass_buf*0.85+arp_buf*0.7+pad_buf*0.5+lead_buf*0.75)*pump
mix=mono*1.0+melodic

# intro riser + impacts at section transitions
place(riser(2.0),0.0,mix)
for s in [0.0,4.0,6.5,14.5,20.5,24.0]:
    place(boom(),s,mix); place(crash(0.8),s,mix)
    if s>=1.0: place(riser(0.5),s-0.5,mix)

mix/=np.max(np.abs(mix))+1e-9; mix*=0.9
d=int(0.008*sr); Lc=mix.copy(); Rc=np.zeros(N); Rc[d:]=mix[:N-d]
out=(np.stack([Lc,Rc],axis=1)*32767).astype(np.int16)
with wave.open('music.wav','w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes(out.tobytes())
print("music.wav written",DUR,"s")
