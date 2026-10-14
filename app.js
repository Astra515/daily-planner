import {localDate,shiftDay,dayIndex,monday,weekFor,isCovered,coursesOn,weekDays,validateTask,draftDates,migrateSlots,SCHEDULE_VERSION} from './core.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const KEY='ljk-daily-planner-v1';
const names=['周一','周二','周三','周四','周五','周六','周日'];
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const blank=()=>({version:1,planRevision:0,tasks:[],notes:{},settings:{slots:migrateSlots(),scheduleVersion:SCHEDULE_VERSION}});
let state=blank(), selected=localDate(), view='day', filter='all', editing=null, deleting=null, draft=[], data, toastTimer;
function toast(s){$('#toast').textContent=s;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3000);}
function storageWarning(s){$('#storage-warning').textContent=s;$('#storage-warning').classList.remove('hidden');}
function normalize(v){
  if(!v||v.version!==1||!Array.isArray(v.tasks)||v.tasks.length>20000)throw Error('无法识别这个备份文件');
  const validDay=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T12:00:00Z'));
  const validTime=s=>typeof s==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(s);
  const result=blank();result.planRevision=Number.isSafeInteger(v.planRevision)?v.planRevision:0;
  result.tasks=v.tasks.map((t,i)=>{
    if(typeof t.title!=='string'||!t.title.trim()||!validDay(t.date)||!Number.isFinite(t.minutes)||t.minutes<5||t.minutes>1440)throw Error('备份中含有无效任务');
    return {id:typeof t.id==='string'?t.id:'import-'+i,title:t.title.slice(0,150),date:t.date,week:validDay(t.week)?monday(t.week):monday(t.date),unscheduled:!!t.unscheduled,time:validTime(t.time)?t.time:'',minutes:t.minutes,due:validDay(t.due)?t.due:'',priority:[1,2,3].includes(t.priority)?t.priority:2,category:['学习','项目','生活','运动','其他'].includes(t.category)?t.category:'其他',detail:typeof t.detail==='string'?t.detail.slice(0,1000):'',done:!!t.done,source:t.source==='chat'?'chat':'local'};
  });
  if(new Set(result.tasks.map(t=>t.id)).size!==result.tasks.length)throw Error('备份中任务标识重复');
  if(v.notes&&typeof v.notes==='object')for(const [d,n] of Object.entries(v.notes))if(validDay(d)&&typeof n==='string')result.notes[d]=n.slice(0,20000);
  result.settings={slots:migrateSlots(v.settings),scheduleVersion:SCHEDULE_VERSION};
  return result;
}
try{const s=localStorage.getItem(KEY);if(s)state=normalize(JSON.parse(s));}catch{storageWarning('无法读取已保存记录。本次内容会暂存在页面中，请先导出备份；暂不覆盖旧数据。');}
let canSave=$('#storage-warning').classList.contains('hidden');
function save(){if(!canSave)return;try{localStorage.setItem(KEY,JSON.stringify(state));}catch{canSave=false;storageWarning('浏览器未允许保存，或空间不足。当前内容仍可使用，请导出备份后再关闭页面。');}}
const taskDay=t=>!t.unscheduled&&t.date===selected;
const sortTasks=(a,b)=>Number(a.done)-Number(b.done)||(a.time||'99:99').localeCompare(b.time||'99:99')||a.priority-b.priority;
const duration=n=>n>=60?`${Math.floor(n/60)}小时${n%60?n%60+'分钟':''}`:`${n}分钟`;
function slotTime(row){const s=state.settings.slots[row];return `<span>时段 ${row+1}</span>${s.start&&s.end?`<br>${s.start}<br>${s.end}`:''}`;}
function taskHTML(t){
  const overdue=!t.done&&t.due&&t.due<localDate();
  return `<div class="task-item ${t.done?'done':''}"><input type="checkbox" class="task-check" data-check="${escape(t.id)}" ${t.done?'checked':''} aria-label="完成 ${escape(t.title)}"><div class="task-body"><div class="task-title">${escape(t.title)}</div><div class="task-meta"><span class="tag">${escape(t.category)}</span>${t.priority===1?'<span class="tag important">重要</span>':''}${t.time&&!t.unscheduled?`<span>${escape(t.time)}</span>`:''}<span>${duration(t.minutes)}</span>${t.due?`<span class="${overdue?'overdue':''}">${overdue?'已逾期 · ':''}${escape(t.due.slice(5))} 截止</span>`:''}</div>${t.detail?`<p class="task-detail">${escape(t.detail)}</p>`:''}</div><div class="task-controls"><button data-edit="${escape(t.id)}" aria-label="编辑 ${escape(t.title)}">编辑</button><button data-delete="${escape(t.id)}" aria-label="删除 ${escape(t.title)}">删除</button></div></div>`;
}
const empty=(title,detail='')=>`<div class="empty"><span class="empty-icon">◌</span>${title}${detail?'<p>'+detail+'</p>':''}</div>`;
function render(){
  if(!data)return;
  $('#date-picker').value=selected;
  const week=weekFor(selected,data);
  $('#week-label').textContent=isCovered(selected,data)?`第 ${week} 周`:'课表未覆盖此日期';
  $('#week-strip').innerHTML=weekDays(selected).map(d=>{const cs=coursesOn(d,data),count=state.tasks.filter(t=>t.date===d&&!t.unscheduled&&!t.done).length;return `<button class="day-pill ${d===selected?'active':''} ${d===localDate()?'is-today':''}" data-day="${d}" aria-label="${d} ${names[dayIndex(d)]}，${cs.length}个课程时段，${count}件待办" ${d===selected?'aria-current="date"':''}><span class="weekday">${names[dayIndex(d)]}</span><span class="day-number">${+d.slice(-2)}</span><span class="load-dots">${Array.from({length:Math.min(5,cs.length+count)},()=>'<i></i>').join('')}</span></button>`;}).join('');
  $('#page-title').textContent={day:'每日安排',week:'本周任务',courses:'每周课表'}[view];
  for(const name of ['day','week','courses'])$('#'+name+'-view').classList.toggle('hidden',view!==name);
  $$('.nav-item').forEach(b=>{b.classList.toggle('active',b.dataset.view===view);b.setAttribute('aria-current',b.dataset.view===view?'page':'false');});
  const cs=coursesOn(selected,data), tasks=state.tasks.filter(taskDay).sort(sortTasks),pending=tasks.filter(t=>!t.done),done=tasks.filter(t=>t.done);
  $('#date-label').textContent=`${selected.replaceAll('-',' / ')} · ${names[dayIndex(selected)]}`;
  $('#day-heading').textContent=selected===localDate()?'今天，按自己的节奏。':'给这一天，留一份清晰的安排。';
  $('#day-caption').textContent=pending.length?`有 ${pending.length} 件待办，预计 ${duration(pending.reduce((n,t)=>n+t.minutes,0))}。从最重要的一件开始。`:'把要做的事写下来，给自己一个轻松的开始。';
  $('#stats').innerHTML=[['▦',cs.length,'个','当天课程'],['◷',pending.length,'件','待完成任务'],['✓',done.length,'件',`已完成${tasks.length?' · '+Math.round(done.length/tasks.length*100)+'%':''}`]].map(([icon,n,unit,label])=>`<div class="stat"><div class="stat-icon">${icon}</div><div><strong>${n}<small>${unit}</small></strong><p>${label}</p></div></div>`).join('');
  $('#course-count').textContent=isCovered(selected,data)?`${cs.length} 个时段`:'未覆盖';
  $('#schedule').innerHTML=!isCovered(selected,data)?empty('这一天超出课表范围','已录入第7-19周；仍可安排和查看任务。'):state.settings.slots.map((s,row)=>{
    const c=cs.find(c=>c.row===row);
    return `<div class="schedule-item"><span class="slot-badge">${slotTime(row)}</span>${c?`<div class="course ${c.cat}" title="${escape(c.name)}" role="button" tabindex="0" data-course="${data.courses.indexOf(c)}"><strong>${escape(c.short)}</strong><small>${escape(c.room)}</small></div>`:`<div class="free-slot"><div><strong>${row===5?'晚间可用时段':'无显示的课程'}</strong><small>${row===5?'无课，可安排学习或其他任务':'可按需要安排任务'}</small></div><button class="text-btn" data-add-slot="${row}" data-slot-day="${selected}">＋ 安排</button></div>`}</div>`;
  }).join('');
  const filtered=tasks.filter(t=>filter==='all'||filter==='done'&&t.done||filter==='todo'&&!t.done);
  $('#tasks').innerHTML=filtered.length?filtered.map(taskHTML).join(''):empty(filter==='done'?'还没有已完成任务':filter==='todo'?'待办已全部完成':'今天还没有任务',filter==='all'?'从一件小事开始，或添加一项课后复习。':'');
  $('#review-btn').disabled=!cs.length;
  $('#daily-note').value=state.notes[selected]||'';
  $('#note-status').textContent=canSave?'自动保存':'请导出备份';
  const queued=state.tasks.filter(t=>t.unscheduled&&t.week===monday(selected)).sort(sortTasks);
  $('#queue-count').textContent=`${queued.length} 件任务`;
  $('#queue').innerHTML=queued.length?queued.map(taskHTML).join(''):empty('本周没有待安排任务','先记录想完成的事，再分配到合适的日期。');
  $('#draft-btn').disabled=!queued.some(t=>!t.done);
  $('#weekly-plan').innerHTML=weekDays(selected).map(d=>{const courses=coursesOn(d,data),items=state.tasks.filter(t=>!t.unscheduled&&t.date===d).sort(sortTasks);return `<section class="week-day-card"><div class="card-head"><h3><button class="week-day-title" data-open-day="${d}">${names[dayIndex(d)]} · ${d.slice(5).replace('-','/')}</button></h3><span class="subtle">${items.filter(t=>t.done).length}/${items.length} 完成</span></div><div class="week-course-list">${courses.length?courses.map(c=>`<span class="week-course-chip ${c.cat}" title="${escape(c.name)} · ${escape(c.room)}">${escape(c.short)}</span>`).join(''):`<span class="subtle">${isCovered(d,data)?'无显示的课程':'课表未覆盖'}</span>`}</div>${items.length?items.map(taskHTML).join(''):empty('还没有安排任务')}<button class="add-line" data-add-day="${d}">＋ 添加任务</button></section>`;}).join('');
  $('#course-table').innerHTML=`<caption class="sr-only">第${week}周课表</caption><thead><tr><th>时段</th>${weekDays(selected).map(d=>`<th>${names[dayIndex(d)]}<small>${d.slice(5).replace('-','/')}</small></th>`).join('')}</tr></thead><tbody>${state.settings.slots.map((_,row)=>`<tr><td>${slotTime(row)}</td>${weekDays(selected).map(d=>{const c=coursesOn(d,data).find(c=>c.row===row);return c?`<td class="filled ${c.cat}"><div class="course ${c.cat}" title="${escape(c.name)}" role="button" tabindex="0" data-course="${data.courses.indexOf(c)}"><strong>${escape(c.short)}</strong><small>${escape(c.room)}</small></div></td>`:row===5&&isCovered(d,data)?`<td class="table-free"><strong>无课 · 可用</strong><button class="text-btn" data-add-slot="5" data-slot-day="${d}">＋ 安排任务</button></td>`:`<td class="table-empty">${isCovered(d,data)?'—':'未覆盖'}</td>`;}).join('')}</tr>`).join('')}</tbody>`;
}
function setDate(d){if(!/^\d{4}-\d{2}-\d{2}$/.test(d))return;selected=d;render();}
function setView(v){view=v;history.replaceState(null,'','#'+v);render();}
function openTask({task=null,date=selected,queue=false,title='',time=''}={}){
  if(!data){toast('课表正在加载，请稍等');return;}
  editing=task?.id||null;$('#task-form').reset();$('#task-error').textContent='';
  const form=$('#task-form');const vals=task||{title,date,time,minutes:30,due:'',priority:2,category:'学习',detail:'',unscheduled:queue};
  for(const name of ['title','date','time','minutes','due','priority','category','detail'])form.elements[name].value=vals[name]??'';
  form.elements.unscheduled.checked=vals.unscheduled;
  $('#task-modal-title').textContent=task?'编辑任务':queue?'添加周任务':'添加任务';
  $('#task-dialog').showModal();form.elements.title.focus();
}
function openSettings(){
  $('#slot-settings').innerHTML=state.settings.slots.map((s,i)=>`<label class="slot-setting"><span>时段 ${i+1}${i===5?'<br><small>无课可用</small>':''}</span><input type="time" name="start${i}" aria-label="时段${i+1}开始" value="${s.start}"><span class="subtle">至</span><input type="time" name="end${i}" aria-label="时段${i+1}结束" value="${s.end}"></label>`).join('');
  $('#settings-error').textContent='';$('#settings-dialog').showModal();
}
function taskPrompt(){
  const days=weekDays(selected),first=days[0],last=days[6];
  const queued=state.tasks.filter(t=>t.unscheduled&&t.week===first&&!t.done);
  const scheduled=state.tasks.filter(t=>!t.unscheduled&&t.date>=first&&t.date<=last&&!t.done);
  let lines=[`请结合我的课表，安排 ${first} 至 ${last} 的周任务，保留吃饭和休息时间。`, '下面是我录入的内容；请根据截止日期和重要程度安排。先不用创建提醒。','', '【未排期任务】'];
  const desc=t=>`${t.title}；${duration(t.minutes)}；${t.priority===1?'重要':t.priority===3?'有空再做':'普通'}${t.due?'；截止 '+t.due:''}${t.detail?'；'+t.detail:''}`;
  lines.push(...(queued.length?queued.map((t,i)=>`${i+1}. ${desc(t)}`):['无']),'','【已有安排】',...(scheduled.length?scheduled.map(t=>`${t.date} ${t.time||'时间未定'}：${desc(t)}`):['无']),'','【本周课表】');
  for(const d of days){const cs=coursesOn(d,data);lines.push(`${d} ${names[dayIndex(d)]}：${!isCovered(d,data)?'超出已录入课表范围':cs.length?cs.map(c=>{const s=state.settings.slots[c.row];return `${s.start&&s.end?s.start+'-'+s.end:'时段'+(c.row+1)} ${c.name}（${c.room}）`;}).join('；'):'没有显示的课程'}`);}
  if(!state.settings.slots.every(s=>s.start&&s.end))lines.push('注意：作息时间尚未补齐，时段1-5仅表示原课表从上到下的顺序，不能直接当作第1-5节。');
  const evening=state.settings.slots[5];lines.push(`第六时段${evening.start&&evening.end?' '+evening.start+'-'+evening.end:''}无课，可用于安排任务。`);
  return lines.join('\n');
}
async function copyText(t){try{await navigator.clipboard.writeText(t);toast('已复制，可以粘贴到聊天中');return true;}catch{toast('请长按清单文字手动复制');return false;}}
function showCourse(index){const c=data?.courses[index];if(!c)return;$('#course-name').textContent=c.name;$('#course-room').textContent=`${c.room} · 时段 ${c.row+1}`;$('#course-dialog').showModal();}
document.addEventListener('keydown',e=>{const c=e.target.closest('[data-course]');if(c&&(e.key==='Enter'||e.key===' ')){e.preventDefault();showCourse(c.dataset.course);}});
document.addEventListener('click',e=>{
  const course=e.target.closest('[data-course]');if(course){showCourse(course.dataset.course);return;}
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.day)setDate(b.dataset.day);
  if(b.dataset.view)setView(b.dataset.view);
  if(b.dataset.openDay){setDate(b.dataset.openDay);setView('day');window.scrollTo({top:0,behavior:'smooth'});}
  if(b.dataset.addDay)openTask({date:b.dataset.addDay});
  if(b.dataset.addSlot!==undefined)openTask({date:b.dataset.slotDay,time:state.settings.slots[Number(b.dataset.addSlot)].start});
  if(b.dataset.edit)openTask({task:state.tasks.find(t=>t.id===b.dataset.edit)});
  if(b.dataset.delete){deleting=b.dataset.delete;$('#confirm-dialog').showModal();}
  if(b.classList.contains('close-dialog'))b.closest('dialog').close();
  if(b.dataset.filter){filter=b.dataset.filter;$$('#filters button').forEach(x=>x.classList.toggle('selected',x===b));render();}
});
document.addEventListener('change',e=>{const id=e.target.dataset.check;if(!id)return;const t=state.tasks.find(t=>t.id===id);if(t){t.done=e.target.checked;save();render();}});
$('#date-picker').addEventListener('change',e=>setDate(e.target.value));
$('#today-btn').onclick=()=>setDate(localDate());
$('#prev-date').onclick=()=>setDate(shiftDay(selected,-1));$('#next-date').onclick=()=>setDate(shiftDay(selected,1));
$('#add-btn').onclick=()=>openTask();$('#add-line').onclick=()=>openTask();$('#queue-btn').onclick=()=>openTask({queue:true});
$('#review-btn').onclick=()=>openTask({title:'复习当天课程',date:selected});
$('#settings-btn').onclick=openSettings;$('#mobile-settings').onclick=openSettings;
$('#daily-note').addEventListener('input',e=>{state.notes[selected]=e.target.value;save();$('#note-status').textContent=canSave?'已保存':'请导出备份';});
$('#task-form').onsubmit=e=>{
  e.preventDefault();const f=new FormData(e.target),prev=state.tasks.find(t=>t.id===editing);
  const t={id:editing||crypto.randomUUID(),title:f.get('title').trim(),date:f.get('date'),week:monday(f.get('date')),unscheduled:f.has('unscheduled'),time:f.get('time'),minutes:Number(f.get('minutes')),due:f.get('due'),priority:Number(f.get('priority')),category:f.get('category'),detail:f.get('detail').trim(),done:prev?.done||false,source:prev?.source||'local'};
  const err=validateTask(t);if(err){$('#task-error').textContent=err;return;}
  if(t.time&&!t.unscheduled){
    const minutes=s=>Number(s.slice(0,2))*60+Number(s.slice(3)),start=minutes(t.time),end=start+t.minutes;
    if(end>1440){$('#task-error').textContent='这个任务会跨到第二天，请拆分任务或调整开始时间';return;}
    const clash=coursesOn(t.date,data).filter(c=>c.cat!=='online').find(c=>{const s=state.settings.slots[c.row];return s.start&&s.end&&start<minutes(s.end)&&end>minutes(s.start);});
    if(clash){$('#task-error').textContent=`与${clash.short}的上课时间冲突，请调整开始时间`;return;}
  }
  if(prev)state.tasks[state.tasks.findIndex(x=>x.id===editing)]=t;else state.tasks.push(t);
  save();$('#task-dialog').close();render();toast('任务已保存');
};
$('#cancel-delete').onclick=()=>$('#confirm-dialog').close();
$('#confirm-delete').onclick=()=>{state.tasks=state.tasks.filter(t=>t.id!==deleting);save();$('#confirm-dialog').close();render();toast('任务已删除');};
$('#settings-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);const slots=Array.from({length:6},(_,i)=>({start:f.get('start'+i),end:f.get('end'+i)}));let last='00:00';for(const s of slots){if(!!s.start!==!!s.end||s.start&&s.end<=s.start){$('#settings-error').textContent='每个时段请同时填写开始和结束，结束时间须晚于开始';return;}if(s.start&&s.start<last){$('#settings-error').textContent='时段须按时间顺序排列，且不能重叠';return;}if(s.end)last=s.end;}state.settings={slots,scheduleVersion:SCHEDULE_VERSION};save();$('#settings-dialog').close();render();toast('作息已更新');};
$('#export-btn').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='日常计划备份-'+localDate()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('备份已导出');
};
$('#import-input').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>15*1024*1024)throw Error('备份文件过大');
    const incoming=normalize(JSON.parse(await file.text()));
    const ids=new Set(state.tasks.map(t=>t.id));const added=incoming.tasks.filter(t=>!ids.has(t.id));state.tasks.push(...added);
    for(const [d,n]of Object.entries(incoming.notes))if(!state.notes[d])state.notes[d]=n;
    if(!state.settings.slots.some(s=>s.start))state.settings=incoming.settings;
    save();render();toast(`已导入 ${added.length} 件任务，已有记录保留`);
  }catch(err){toast(err.message||'导入失败，请检查备份文件');}finally{e.target.value='';}
};
$('#copy-btn').onclick=async()=>{const t=taskPrompt();$('#copy-text').value=t;$('#copy-dialog').showModal();await copyText(t);};
$('#retry-copy').onclick=()=>copyText($('#copy-text').value);
$('#draft-btn').onclick=()=>{
  const queue=state.tasks.filter(t=>t.unscheduled&&!t.done&&t.week===monday(selected));
  draft=draftDates(queue,weekDays(selected),data,state.tasks.filter(t=>!t.unscheduled),state.settings);
  $('#draft-list').innerHTML=draft.map(t=>`<div class="draft-row"><span>${escape(t.title)}<small class="subtle"> · ${duration(t.minutes)}</small></span><span>${t.date?names[dayIndex(t.date)]+' '+t.date.slice(5):'本周无可用日期'}</span></div>`).join('');
  $('#apply-draft').disabled=!draft.some(t=>t.date);$('#draft-dialog').showModal();
};
$('#apply-draft').onclick=()=>{let n=0;for(const d of draft){if(!d.date)continue;const t=state.tasks.find(t=>t.id===d.id);if(t){t.date=d.date;t.week=monday(d.date);t.unscheduled=false;t.time='';n++;}}save();$('#draft-dialog').close();render();toast(`已安排 ${n} 件任务，可继续调整具体时间`);};
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){try{state=normalize(JSON.parse(e.newValue));render();}catch{toast('另一页面的记录无效，已保留当前内容');}}});
window.addEventListener('hashchange',()=>{const v=location.hash.slice(1);if(['day','week','courses'].includes(v))setView(v);});
try{
  const response=await fetch('./schedule.json');if(!response.ok)throw Error('course-data');data=await response.json();
  try{
    const planResponse=await fetch('./plan.json',{cache:'no-store'});
    if(planResponse.ok){const plan=await planResponse.json();
      if(Number.isSafeInteger(plan.revision)&&plan.revision>state.planRevision){
        const planned=normalize({version:1,tasks:plan.tasks.map(t=>({...t,source:'chat',unscheduled:false}))}).tasks;
        const done=new Map(state.tasks.map(t=>[t.id,t.done]));
        state.tasks=state.tasks.filter(t=>t.source!=='chat').concat(planned.map(t=>({...t,done:done.get(t.id)||false})));
        state.planRevision=plan.revision;save();if(planned.length)toast('聊天中的计划已更新，完成记录已保留');
      }
    }
  }catch{toast('聊天计划暂时无法同步，已保留当前记录');}
  const initial=location.hash.slice(1);if(['day','week','courses'].includes(initial))view=initial;render();
}catch{storageWarning('课表加载失败，请刷新页面或稍后重试。');$('#day-caption').textContent='暂时无法加载课程数据。';$('#add-btn').disabled=true;}
