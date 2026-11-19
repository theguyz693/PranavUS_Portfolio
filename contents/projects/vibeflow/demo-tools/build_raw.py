import json,subprocess,sys,os,cv2
import os
FF=os.environ.get("FFMPEG","ffmpeg")
FPS=24
for name in sys.argv[1:]:
    fr=json.load(open(f'frames/{name}/times.json')); t0=fr[0]['t']; span=fr[-1]['t']-t0
    n_out=int(span*FPS)
    p=subprocess.Popen([FF,'-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s','1280x720','-r',str(FPS),'-i','-',
                        '-c:v','libx264','-crf','10','-preset','fast','-pix_fmt','yuv420p',f'raw_{name}.mp4'],stdin=subprocess.PIPE)
    j=0; cur=None; curj=-1
    for k in range(n_out):
        t=t0+k/FPS
        while j+1<len(fr) and fr[j+1]['t']<=t: j+=1   # latest source frame at or before t
        if j!=curj:
            cur=cv2.imread(f'frames/{name}/{fr[j]["file"]}'); 
            if cur.shape[1]!=1280 or cur.shape[0]!=720: cur=cv2.resize(cur,(1280,720))
            curj=j
        p.stdin.write(cur.tobytes())
    p.stdin.close(); p.wait()
    c=cv2.VideoCapture(f'raw_{name}.mp4'); print(name,'raw dur',round(c.get(7)/c.get(5),2),'real span',round(span,2))
