export const localDate = (d = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
export const parseDay = s => new Date(s + 'T12:00:00Z');
export function shiftDay(s, days) { const d=parseDay(s);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10); }
export const dayIndex = s => (parseDay(s).getUTCDay()+6)%7;
export const monday = s => shiftDay(s,-dayIndex(s));
export function weekFor(s, data) {return data.firstWeek + Math.floor((parseDay(s)-parseDay(data.start))/604800000);}
export function isCovered(s,data) {return s>=data.start && s<=data.end;}
export function coursesOn(s,data) {if(!isCovered(s,data))return [];const w=weekFor(s,data);return data.courses.filter(c=>c.day===dayIndex(s)&&c.weeks.includes(w)).sort((a,b)=>a.row-b.row);}
export function weekDays(s) {const first=monday(s);return Array.from({length:7},(_,i)=>shiftDay(first,i));}
export const SCHEDULE_VERSION=1;
export const DEFAULT_SLOTS=[
  {start:'08:00',end:'09:50'},
  {start:'10:10',end:'12:00'},
  {start:'14:00',end:'15:50'},
  {start:'16:10',end:'18:00'},
  {start:'19:00',end:'20:50'},
  {start:'21:10',end:'23:00'}
];
export function migrateSlots(settings) {
  if(settings?.scheduleVersion!==SCHEDULE_VERSION)return DEFAULT_SLOTS.map(s=>({...s}));
  const valid=s=>typeof s==='string'&&(/^([01]\d|2[0-3]):[0-5]\d$/.test(s)||s==='');
  return DEFAULT_SLOTS.map((fallback,i)=>{
    const s=settings?.slots?.[i];
    return s&&valid(s.start)&&valid(s.end)?{start:s.start,end:s.end}:{...fallback};
  });
}
export function validateTask(t) {
  if(!t.title.trim())return '请填写任务名称';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||Number.isNaN(+parseDay(t.date)))return '请选择安排日期';
  if(t.due && t.date>t.due)return '安排日期不能晚于截止日期';
  if(!Number.isFinite(t.minutes)||t.minutes<5||t.minutes>1440)return '预计耗时请填写5-1440分钟';
  return '';
}
export function draftDates(tasks,days,data,existing,settings) {
  const workload=new Map(days.map(d=>[d,existing.filter(t=>t.date===d&&!t.done).reduce((n,t)=>n+t.minutes,0)]));
  const slots=settings?.slots;
  const parse=s=>{const [h,m]=s.split(':').map(Number);return h*60+m;};
  const capacity=d=>{
    // Suggest a date only; the sixth slot is available and never adds to class load.
    let classLoad=coursesOn(d,data).length*90;
    if(slots?.length>=5 && slots.slice(0,5).every(s=>s.start&&s.end))classLoad=coursesOn(d,data).reduce((n,c)=>n+parse(slots[c.row].end)-parse(slots[c.row].start),0);
    return Math.max(60,360-classLoad*.55);
  };
  return [...tasks].sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.priority-b.priority).map(t=>{
    const eligible=days.filter(d=>(!t.due||d<=t.due)&&d>=localDate());
    if(!eligible.length)return {...t,date:null};
    eligible.sort((a,b)=>(workload.get(a)+t.minutes)/capacity(a)-(workload.get(b)+t.minutes)/capacity(b)||a.localeCompare(b));
    const chosen=eligible[0];workload.set(chosen,workload.get(chosen)+t.minutes);
    return {...t,date:chosen};
  });
}
