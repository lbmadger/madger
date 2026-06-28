import numpy as np, wave, struct, sys

sr = 44100
BPM = 120
beat = 60.0/BPM            # 0.5s
bar = beat*4               # 2.0s
DUR = 36.0
N = int(sr*DUR)
L = np.zeros(N); R = np.zeros(N)

def place(buf, sig, t):
    i = int(t*sr)
    j = min(len(buf), i+len(sig))
    if i < len(buf):
        buf[i:j] += sig[:j-i]

def env_exp(n, decay):
    t = np.arange(n)/sr
    return np.exp(-t*decay)

def kick(vel=1.0):
    d = 0.34; n = int(sr*d); t = np.arange(n)/sr
    freq = 45 + 110*np.exp(-t*32)
    ph = 2*np.pi*np.cumsum(freq)/sr
    sig = np.sin(ph)*np.exp(-t*8.5)
    # click
    sig[:200] += np.linspace(1,0,200)*0.5
    return sig*vel

def hat(open=False, vel=1.0):
    d = 0.12 if open else 0.045; n=int(sr*d)
    noise = np.random.randn(n)
    noise = np.diff(noise, prepend=0)        # crude highpass -> bright
    sig = noise*env_exp(n, 60 if not open else 22)
    return sig*0.5*vel

def clap(vel=1.0):
    d=0.18; n=int(sr*d); noise=np.random.randn(n)
    noise=np.diff(noise,prepend=0)
    env=env_exp(n,28)
    # 3 quick transients
    out=noise*env
    for off in (0.008,0.016):
        s=int(off*sr); e=env_exp(n,30); tmp=np.zeros(n); tmp[s:]=(noise*e)[:n-s]; out+=tmp
    return out*0.45*vel

def crash(vel=1.0):
    d=1.4; n=int(sr*d); noise=np.random.randn(n)
    sig=noise*env_exp(n,3.2)
    return sig*0.3*vel

def saw(f,n):
    t=np.arange(n)/sr
    return 2*(f*t-np.floor(0.5+f*t))

def bass(f,d,vel=1.0):
    n=int(sr*d); t=np.arange(n)/sr
    s=0.6*saw(f,n)+0.4*np.sin(2*np.pi*f*t)
    a=int(0.005*sr); env=np.ones(n); env[:a]=np.linspace(0,1,a)
    env*=np.exp(-t*5.0)
    # lowpass-ish: smooth
    s=np.convolve(s,np.ones(8)/8,mode='same')
    return s*env*vel

def pluck(f,d,vel=1.0):
    n=int(sr*d); t=np.arange(n)/sr
    s=np.sin(2*np.pi*f*t)+0.5*np.sin(4*np.pi*f*t)+0.25*np.sin(6*np.pi*f*t)
    a=int(0.003*sr); env=np.ones(n); env[:a]=np.linspace(0,1,a)
    env*=np.exp(-t*7.0)
    return s*env*vel

def riser(d):
    n=int(sr*d); t=np.arange(n)/sr
    noise=np.random.randn(n)
    env=(t/d)**2
    f=200+2000*(t/d)
    tone=np.sin(2*np.pi*np.cumsum(f)/sr)*0.3
    return (noise*0.25+tone)*env

NOTE={'A2':110.0,'F2':87.31,'C3':130.81,'G2':98.0,
      'A3':220.0,'C4':261.63,'E4':329.63,'F3':174.61,'G3':196.0,'A4':440.0,'E5':659.25}
# chord roots per bar (Am F C G loop) and arp tones
prog=[('A2',['A3','C4','E4','A4']),('F2',['F3','A3','C4','F2']),
      ('C3',['C4','E4','G3','C4']),('G2',['G3','C4','E4','G3'])]

nbars=int(DUR/bar)+1
mono=np.zeros(N)

for b in range(nbars):
    t0=b*bar
    root,arp=prog[b%4]
    rf=NOTE[root]
    full = b>=1            # bar 0 = intro
    # crash on drops
    if b in (1,9):
        place(mono, crash(1.0), t0)
    # kick 4-on-floor
    for k in range(4):
        if full or k==0:
            place(mono, kick(1.0 if k==0 else 0.9), t0+k*beat)
    # clap on 2 & 4
    if full:
        place(mono, clap(), t0+beat)
        place(mono, clap(), t0+3*beat)
    # hats on 8ths, accent offbeats
    for h in range(8):
        if full or h%2==1:
            place(mono, hat(open=(h%4==3), vel=0.9 if h%2 else 0.6), t0+h*0.5*beat)
    # bass 8ths
    if full:
        for h in range(8):
            f=rf*(2 if h%4==2 else 1)
            place(mono, bass(f,0.24,0.9), t0+h*0.5*beat)
    # pluck arp 8ths (quiet)
    for h in range(8):
        f=NOTE[arp[h%4]]*1.0
        place(mono, pluck(f,0.22,0.5 if full else 0.3), t0+h*0.5*beat)

# intro riser into the drop
place(mono, riser(2.0), 0.0)

# ----- sidechain "pump": dip everything on each kick for that driving feel -----
pump=np.ones(N)
for b in range(nbars):
    for k in range(4):
        i=int((b*bar+k*beat)*sr)
        if i<N:
            seg=min(N-i, int(0.42*sr))
            tt=np.arange(seg)/sr
            duck=0.45+0.55*(1-np.exp(-tt*9))   # dip to 0.45 then recover
            pump[i:i+seg]=np.minimum(pump[i:i+seg],duck)
mono*=pump

# normalize
mono/=np.max(np.abs(mono))+1e-9
mono*=0.85
# tiny stereo width via short delay on R
d=int(0.008*sr)
Lc=mono.copy(); Rc=np.zeros(N); Rc[d:]=mono[:N-d]
stereo=np.stack([Lc,Rc],axis=1)

# write 16-bit wav
out=(stereo*32767).astype(np.int16)
with wave.open('music.wav','w') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes(out.tobytes())
print("music.wav written", DUR, "s")
