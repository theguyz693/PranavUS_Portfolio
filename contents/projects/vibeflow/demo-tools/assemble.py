import subprocess,sys,json
import os
FF=os.environ.get("FFMPEG","ffmpeg")
# (raw file, start, length) -- chosen from contact sheets
SEG=[('disc',1.3,3.0),('ipod',0.6,3.0),('ipod',5.3,3.0),('editorial',2.8,3.0),('screens',1.2,3.0),('disc',11.6,3.0)]
args=[FF,'-y','-loglevel','error']
for f,_,_ in SEG: args+=['-i',f'raw_{f}.mp4']
fc=''
for i,(f,s,l) in enumerate(SEG):
    fc+=f'[{i}:v]trim=start={s}:duration={l},setpts=PTS-STARTPTS,fps=24,settb=AVTB[v{i}];'
fc+=''.join(f'[v{i}]' for i in range(len(SEG)))+f'concat=n={len(SEG)}:v=1:a=0[seq]'
subprocess.run(args+['-filter_complex',fc,'-map','[seq]','-c:v','libx264','-crf','10','-preset','fast','-pix_fmt','yuv420p','seq.mp4'],check=True)
T=sum(l for _,_,l in SEG); d=0.5
# seamless loop: blend the last d seconds into the first d seconds, then play the middle
fc2=(f'[0:v]split=3[a][b][c];'
     f'[a]trim=start=0:end={d},setpts=PTS-STARTPTS,settb=AVTB,fps=24[head];'
     f'[b]trim=start={T-d}:end={T},setpts=PTS-STARTPTS,settb=AVTB,fps=24[tail];'
     f'[c]trim=start={d}:end={T-d},setpts=PTS-STARTPTS,settb=AVTB,fps=24[body];'
     f'[tail][head]xfade=transition=fade:duration={d}:offset=0[x];'
     f'[x][body]concat=n=2:v=1:a=0[out]')
subprocess.run([FF,'-y','-loglevel','error','-i','seq.mp4','-filter_complex',fc2,'-map','[out]','-c:v','libx264','-crf','10','-preset','fast','-pix_fmt','yuv420p','loop_raw.mp4'],check=True)
print('assembled; seq length',T,'loop length',T-d)
