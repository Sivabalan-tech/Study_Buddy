// Timer component
class Timer{
    constructor(){this.startTime=0;this.elapsed=0;this.id=null;this.running=false;}
    start(){ if(this.running) return; this.startTime=Date.now()-this.elapsed; this.id=setInterval(()=>{this.elapsed=Date.now()-this.startTime; this.update();},1000); this.running=true; }
    pause(){ if(!this.running) return; clearInterval(this.id); this.running=false; }
    reset(){ this.pause(); this.elapsed=0; this.update(); }
    format(){ const s=Math.floor(this.elapsed/1000); const m=String(Math.floor(s/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return `${m}:${ss}`; }
    update(){ const el=document.getElementById('quiz-timer'); if(el) el.textContent=this.format(); }
  }
  window.QuizTimer = new Timer();
  