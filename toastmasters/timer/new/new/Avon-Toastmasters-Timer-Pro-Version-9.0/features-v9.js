(function(){
  'use strict';

  var MONTH=30*24*60*60*1000;
  var ACTIVE_KEY='tmTimingDeskActiveV1';
  var PRESET_KEY='tmTimingDeskCustomPresetsV1';
  var TEMPLATE_KEY='tmTimingDeskTemplatesV1';
  var RECYCLE_KEY='tmTimingDeskRecycleV1';
  var agendaQueue=[];
  var activeAgendaId=null;
  var customPresets=[];
  var meetingTemplates=[];
  var recycleBin=[];
  var pendingRecovery=null;
  var activeSaveTick=0;
  var toastTimer=0;
  var lastToolFocus=null;
  var originalRender=render;

  function makeId(prefix){return prefix+'-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8)}
  function optionExists(select,value){return Array.from(select.options).some(function(option){return option.value===value})}
  function safeRead(key,fallback){
    try{
      var saved=JSON.parse(localStorage.getItem(key)||'null');
      if(!saved)return fallback;
      if(saved.expiresAt&&Number(saved.expiresAt)<Date.now()){localStorage.removeItem(key);return fallback}
      return saved.data===undefined?saved:saved.data;
    }catch(e){return fallback}
  }
  function safeWrite(key,data){
    try{localStorage.setItem(key,JSON.stringify({expiresAt:Date.now()+MONTH,data:data}))}catch(e){}
  }
  function downloadFile(name,type,content){
    var link=document.createElement('a'),url=URL.createObjectURL(new Blob([content],{type:type}));
    link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();
    setTimeout(function(){URL.revokeObjectURL(url)},1200)
  }

  message=function(text,canUndo){
    var toast=$('toast'),textNode=$('toastText'),undo=$('toastUndoBtn');
    if(!textNode){toast.innerHTML='<span id="toastText"></span><button class="hidden" id="toastUndoBtn" type="button">Undo</button>';textNode=$('toastText');undo=$('toastUndoBtn');undo.onclick=undoLast}
    textNode.textContent=text;
    undo.classList.toggle('hidden',!canUndo);
    clearTimeout(toastTimer);toast.classList.add('show');
    toastTimer=setTimeout(function(){toast.classList.remove('show')},canUndo?6500:2800)
  };

  function getTimingPreset(key){
    if(PRESETS[key])return Object.assign({key:key},PRESETS[key]);
    if(String(key).indexOf('saved:')===0){
      var id=String(key).slice(6),found=customPresets.find(function(item){return item.id===id});
      if(found)return Object.assign({key:key},found)
    }
    return null
  }
  function describeTiming(p){return rangeLabel(p)+' · yellow '+fmt(p.amber)+' · overtime cue '+fmt(p.grace)}
  function renderPresetOptions(){
    ['preset','agendaItemPreset'].forEach(function(id){
      var select=$(id);if(!select)return;
      var old=select.querySelector('optgroup[data-saved-presets]');if(old)old.remove();
      if(!customPresets.length)return;
      var group=document.createElement('optgroup');group.label='My saved timings';group.dataset.savedPresets='true';
      customPresets.forEach(function(item){var option=document.createElement('option');option.value='saved:'+item.id;option.textContent=item.name+' · '+rangeLabel(item);group.appendChild(option)});
      var customOption=select.querySelector('option[value="custom"]');
      if(customOption&&customOption.parentElement===select)select.insertBefore(group,customOption);else select.appendChild(group)
    });
    renderSavedPresets()
  }
  updateTimingSummary=function(){
    var p=current(),problem=timingProblem(p),key=$('preset').value,custom=key==='custom',saved=String(key).indexOf('saved:')===0,box=$('timingSummary');
    $('timingModeLabel').textContent=(custom?'Custom':(saved?'Saved preset':'Preset'))+' · min + sec';
    box.classList.toggle('invalid',!!problem);
    box.textContent=problem||((custom?'Custom set range ':'Set range ')+rangeLabel(p)+' · yellow at '+fmt(p.amber)+' · static overtime warning '+fmt(p.grace)+' after red');
    return problem
  };
  setPreset=function(){
    var key=$('preset').value,preset=getTimingPreset(key);
    if(key!=='custom'&&preset)setTimeInputs(preset);
    reset(true);updateTimingSummary();updateTimer();save();
    if(key==='custom')$('greenMin').focus()
  };
  function saveCustomPreset(){
    var name=$('presetName').value.trim(),p=current(),problem=timingProblem(p);
    if(problem){message(problem);return}
    if(!name){message('Add a name for this timing preset.');$('presetName').focus();return}
    var existing=customPresets.find(function(item){return item.name.toLowerCase()===name.toLowerCase()});
    if(existing){existing.green=p.green;existing.amber=p.amber;existing.red=p.red;existing.grace=p.grace;existing.updatedAt=Date.now();message(name+' timing preset updated.')}else{customPresets.push({id:makeId('preset'),name:name,green:p.green,amber:p.amber,red:p.red,grace:p.grace,createdAt:Date.now()});message(name+' timing preset saved.')}
    safeWrite(PRESET_KEY,customPresets);$('presetName').value='';renderPresetOptions()
  }
  function usePreset(id){var value='saved:'+id;if(!optionExists($('preset'),value))return;$('preset').value=value;setPreset();closeToolModal('presetModal');message('Saved timing loaded.')}
  function deletePreset(id){var item=customPresets.find(function(x){return x.id===id});if(!item)return;if(!confirm('Delete the saved timing “'+item.name+'”?'))return;customPresets=customPresets.filter(function(x){return x.id!==id});safeWrite(PRESET_KEY,customPresets);if($('preset').value==='saved:'+id){$('preset').value='custom'}renderPresetOptions();message('Saved timing deleted.')}
  function renderSavedPresets(){
    var list=$('savedPresetList');if(!list)return;
    list.innerHTML=customPresets.length?customPresets.map(function(item){return'<article class="preset-item"><div><b>'+esc(item.name)+'</b><span>'+esc(describeTiming(item))+'</span></div><div class="item-actions"><button data-use-preset="'+esc(item.id)+'">Use</button><button class="danger" data-delete-preset="'+esc(item.id)+'">Delete</button></div></article>'}).join(''):'<div class="preset-empty">No custom timing presets saved yet.</div>';
    list.querySelectorAll('[data-use-preset]').forEach(function(button){button.onclick=function(){usePreset(button.dataset.usePreset)}});
    list.querySelectorAll('[data-delete-preset]').forEach(function(button){button.onclick=function(){deletePreset(button.dataset.deletePreset)}})
  }

  function meetingState(){
    var p=current();
    return{club:$('club').value,title:$('meetingTitle').value,date:$('meetingDate').value,agendaRole:$('agendaRole').value,preset:$('preset').value,green:p.green,amber:p.amber,red:p.red,grace:p.grace,customSection:$('customSection').value,customRoleName:$('customRoleName').value,agendaQueue:agendaQueue,activeAgendaId:activeAgendaId,competitionMode:$('competitionMode').checked,competitionType:$('competitionType').value}
  }
  save=function(){
    try{
      localStorage.setItem('avonTimerRecords',JSON.stringify(records));
      localStorage.setItem('avonTimerMeeting',JSON.stringify(meetingState()));
      localStorage.setItem('avonTimerSavedAt',String(Date.now()))
    }catch(e){}
  };
  function loadV9Data(){
    customPresets=safeRead(PRESET_KEY,[]);meetingTemplates=safeRead(TEMPLATE_KEY,[]);recycleBin=safeRead(RECYCLE_KEY,[]);
    if(!Array.isArray(customPresets))customPresets=[];if(!Array.isArray(meetingTemplates))meetingTemplates=[];if(!Array.isArray(recycleBin))recycleBin=[];
    recycleBin=recycleBin.filter(function(item){return Number(item.createdAt)>Date.now()-MONTH});safeWrite(RECYCLE_KEY,recycleBin);
    renderPresetOptions();
    try{
      var meeting=JSON.parse(localStorage.getItem('avonTimerMeeting')||'{}');
      agendaQueue=Array.isArray(meeting.agendaQueue)?meeting.agendaQueue:[];activeAgendaId=meeting.activeAgendaId||null;
      if(meeting.preset&&optionExists($('preset'),meeting.preset))$('preset').value=meeting.preset;
      $('competitionMode').checked=!!meeting.competitionMode;
      if(meeting.competitionType&&optionExists($('competitionType'),meeting.competitionType))$('competitionType').value=meeting.competitionType
    }catch(e){agendaQueue=[];activeAgendaId=null}
  }

  function agendaItemFromTimer(){
    var p=current();
    return{id:makeId('agenda'),name:$('participant').value.trim(),title:$('activity').value.trim(),section:p.section,role:p.label,preset:$('preset').value,green:p.green,amber:p.amber,red:p.red,grace:p.grace,status:'pending'}
  }
  function agendaItemFromForm(){
    var key=$('agendaItemPreset').value,p=getTimingPreset(key)||PRESETS.speech57;
    return{id:makeId('agenda'),name:$('agendaItemName').value.trim(),title:$('agendaItemTitle').value.trim(),section:$('agendaItemSection').value.trim()||'Other Roles',role:$('agendaItemRole').value.trim()||'Meeting Role',preset:key,green:p.green,amber:p.amber,red:p.red,grace:p.grace,status:'pending'}
  }
  function addAgendaItem(item){
    if(!item.name){message('Add the participant name before adding the agenda item.');return false}
    agendaQueue.push(item);save();renderAgenda();message(item.name+' added to the optional agenda.');return true
  }
  function captureAgenda(){if(addAgendaItem(agendaItemFromTimer())){$('agendaItemName').value='';$('agendaItemTitle').value=''}}
  function addAgendaFromForm(){if(addAgendaItem(agendaItemFromForm())){$('agendaItemName').value='';$('agendaItemTitle').value='';$('agendaItemName').focus()}}
  function findAgendaRole(section,role){return Object.keys(AGENDA_ROLES).find(function(key){return AGENDA_ROLES[key].section===section&&AGENDA_ROLES[key].label===role})||'custom'}
  function loadAgendaItem(id){
    var item=agendaQueue.find(function(x){return x.id===id});if(!item)return false;
    if(elapsed>0&&preferences.confirmReset&&!confirm('The current time ('+fmt(elapsed/1000,true)+') has not been saved. Load '+item.name+' without saving it?'))return false;
    reset(true);$('participant').value=item.name;$('activity').value=item.title||'';$('section').value=item.section;$('role').value=item.role;
    var roleKey=findAgendaRole(item.section,item.role);$('agendaRole').value=roleKey;
    if(roleKey==='custom'){$('customSection').value=item.section;$('customRoleName').value=item.role;$('customRoleFields').classList.remove('hidden')}else $('customRoleFields').classList.add('hidden');
    if(optionExists($('preset'),item.preset))$('preset').value=item.preset;else $('preset').value='custom';setTimeInputs(item);
    agendaQueue.forEach(function(entry){if(entry.status==='active')entry.status='pending'});item.status='active';activeAgendaId=item.id;
    save();refreshRolePreview();updateTimingSummary();renderAgenda();closeToolModal('agendaModal');$('participant').focus();message(item.name+' loaded from the agenda.');return true
  }
  function loadNextAgenda(){var next=agendaQueue.find(function(item){return item.status==='pending'});if(!next){message(agendaQueue.length?'The agenda queue is complete.':'The optional agenda is empty.');return}loadAgendaItem(next.id)}
  function moveAgenda(id,direction){var index=agendaQueue.findIndex(function(item){return item.id===id}),next=index+direction;if(index<0||next<0||next>=agendaQueue.length)return;var item=agendaQueue.splice(index,1)[0];agendaQueue.splice(next,0,item);save();renderAgenda()}
  function deleteAgendaItem(id){var index=agendaQueue.findIndex(function(item){return item.id===id});if(index<0)return;var item=agendaQueue[index];if(!confirm('Remove '+item.name+' from the optional agenda?'))return;agendaQueue.splice(index,1);if(activeAgendaId===id)activeAgendaId=null;save();renderAgenda();message('Agenda item removed.')}
  function clearAgenda(){if(!agendaQueue.length)return;if(!confirm('Clear the optional agenda queue? Saved timing results will not be affected.'))return;agendaQueue=[];activeAgendaId=null;save();renderAgenda();message('Agenda queue cleared.')}
  function renderAgenda(){
    var count=$('agendaCount');if(!count)return;count.textContent=agendaQueue.length;
    var done=agendaQueue.filter(function(item){return item.status==='done'}).length,active=agendaQueue.find(function(item){return item.id===activeAgendaId}),pending=agendaQueue.length-done-(active?1:0);
    $('agendaNav').classList.toggle('hidden',!agendaQueue.length);
    $('agendaProgress').textContent=active?('Timing '+active.name+' · '+done+' of '+agendaQueue.length+' complete'):(done+' of '+agendaQueue.length+' complete · '+Math.max(0,pending)+' waiting');
    $('agendaListSummary').textContent=agendaQueue.length?(done+' complete · '+Math.max(0,pending)+' waiting'+(active?' · 1 active':'')):'No agenda items yet.';
    $('agendaList').innerHTML=agendaQueue.length?agendaQueue.map(function(item,index){var status=item.status||'pending';return'<article class="agenda-item '+esc(status)+'"><div><b>'+(index+1)+'. '+esc(item.name)+' · '+esc(item.role)+'</b><span>'+esc(item.section+(item.title?' · '+item.title:''))+'</span><span>'+esc(describeTiming(item))+'</span><small>'+esc(status)+'</small></div><div class="item-actions"><button data-load-agenda="'+esc(item.id)+'">Load</button><button data-move-agenda="'+esc(item.id)+'" data-direction="-1" aria-label="Move up">↑</button><button data-move-agenda="'+esc(item.id)+'" data-direction="1" aria-label="Move down">↓</button><button class="danger" data-delete-agenda="'+esc(item.id)+'">Delete</button></div></article>'}).join(''):'<div class="agenda-empty">Agenda building is optional. Add someone here, or close this window and use the normal timer.</div>';
    $('agendaList').querySelectorAll('[data-load-agenda]').forEach(function(button){button.onclick=function(){loadAgendaItem(button.dataset.loadAgenda)}});
    $('agendaList').querySelectorAll('[data-move-agenda]').forEach(function(button){button.onclick=function(){moveAgenda(button.dataset.moveAgenda,Number(button.dataset.direction))}});
    $('agendaList').querySelectorAll('[data-delete-agenda]').forEach(function(button){button.onclick=function(){deleteAgendaItem(button.dataset.deleteAgenda)}});
    renderTemplates()
  }

  function saveTemplate(){
    var name=$('templateName').value.trim();if(!name){message('Add a template name first.');$('templateName').focus();return}if(!agendaQueue.length){message('Add at least one agenda item before saving a template.');return}
    var existing=meetingTemplates.find(function(item){return item.name.toLowerCase()===name.toLowerCase()}),data={name:name,club:$('club').value,title:$('meetingTitle').value,items:agendaQueue.map(function(item){return Object.assign({},item,{status:'pending'})}),updatedAt:Date.now()};
    if(existing)Object.assign(existing,data);else{data.id=makeId('template');data.createdAt=Date.now();meetingTemplates.push(data)}
    safeWrite(TEMPLATE_KEY,meetingTemplates);$('templateName').value='';renderTemplates();message(name+' meeting template saved.')
  }
  function loadTemplate(){
    var id=$('templateSelect').value,item=meetingTemplates.find(function(x){return x.id===id});if(!item){message('Choose a saved meeting template.');return}
    if(agendaQueue.length&&!confirm('Replace the current optional agenda with “'+item.name+'”?'))return;
    agendaQueue=item.items.map(function(entry){return Object.assign({},entry,{id:makeId('agenda'),status:'pending'})});activeAgendaId=null;
    if(item.club)$('club').value=item.club;if(item.title)$('meetingTitle').value=item.title;save();renderAgenda();message(item.name+' template loaded.')
  }
  function deleteTemplate(){var id=$('templateSelect').value,item=meetingTemplates.find(function(x){return x.id===id});if(!item){message('Choose a saved meeting template.');return}if(!confirm('Delete the meeting template “'+item.name+'”?'))return;meetingTemplates=meetingTemplates.filter(function(x){return x.id!==id});safeWrite(TEMPLATE_KEY,meetingTemplates);renderTemplates();message('Meeting template deleted.')}
  function renderTemplates(){var select=$('templateSelect');if(!select)return;var selected=select.value;select.innerHTML='<option value="">Choose a saved template</option>'+meetingTemplates.map(function(item){return'<option value="'+esc(item.id)+'">'+esc(item.name)+' · '+item.items.length+' items</option>'}).join('');if(optionExists(select,selected))select.value=selected}

  function activeSnapshot(){
    var p=current();
    return{elapsedMs:elapsed,running:running,wallStartedAt:running?Date.now()-elapsed:null,participant:$('participant').value,activity:$('activity').value,section:p.section,role:p.label,agendaRole:$('agendaRole').value,customSection:$('customSection').value,customRoleName:$('customRoleName').value,preset:$('preset').value,green:p.green,amber:p.amber,red:p.red,grace:p.grace,activeAgendaId:activeAgendaId,competitionMode:$('competitionMode').checked,competitionType:$('competitionType').value,savedAt:Date.now()}
  }
  function persistActive(){if(elapsed<=0){clearActive();return}try{localStorage.setItem(ACTIVE_KEY,JSON.stringify(activeSnapshot()))}catch(e){}}
  function clearActive(){try{localStorage.removeItem(ACTIVE_KEY)}catch(e){}}
  function applyTimerState(state,resume){
    reset(true);$('participant').value=state.participant||'';$('activity').value=state.activity||'';$('section').value=state.section||'Custom Roles';$('role').value=state.role||'Custom Role';
    var agendaRole=state.agendaRole&&optionExists($('agendaRole'),state.agendaRole)?state.agendaRole:findAgendaRole(state.section,state.role);$('agendaRole').value=agendaRole;
    $('customSection').value=state.customSection||state.section||'Custom Roles';$('customRoleName').value=state.customRoleName||state.role||'Custom Role';$('customRoleFields').classList.toggle('hidden',agendaRole!=='custom');
    if(state.preset&&optionExists($('preset'),state.preset))$('preset').value=state.preset;else $('preset').value='custom';setTimeInputs(state);
    activeAgendaId=state.activeAgendaId||null;$('competitionMode').checked=!!state.competitionMode;if(state.competitionType&&optionExists($('competitionType'),state.competitionType))$('competitionType').value=state.competitionType;applyCompetitionMode(false);
    elapsed=Math.max(0,Number(state.elapsedMs)||0);lastCue='ready';running=!!resume&&!!state.running;
    if(running){startAt=performance.now()-elapsed;$('startBtn').textContent='Ⅱ Pause';raf=requestAnimationFrame(tick);requestWakeLock()}else $('startBtn').textContent=elapsed>0?'▶ Resume':'▶ Start timer';
    refreshRolePreview();updateTimingSummary();updateTimer();save();if(elapsed>0)persistActive()
  }
  function checkRecovery(){
    try{pendingRecovery=JSON.parse(localStorage.getItem(ACTIVE_KEY)||'null')}catch(e){pendingRecovery=null}
    if(!pendingRecovery||Number(pendingRecovery.savedAt)<Date.now()-24*60*60*1000||Number(pendingRecovery.elapsedMs)<=0){pendingRecovery=null;clearActive();return}
    if(pendingRecovery.running&&pendingRecovery.wallStartedAt)pendingRecovery.elapsedMs=Math.max(pendingRecovery.elapsedMs,Date.now()-Number(pendingRecovery.wallStartedAt));
    $('recoveryText').textContent=(pendingRecovery.participant||'Unnamed participant')+' · '+fmt(pendingRecovery.elapsedMs/1000,true)+(pendingRecovery.running?' · was running':' · was paused');$('recoveryBanner').classList.remove('hidden')
  }
  function restoreRecovery(){if(!pendingRecovery)return;$('recoveryBanner').classList.add('hidden');applyTimerState(pendingRecovery,true);pendingRecovery=null;message('Unsaved timer restored.')}
  function discardRecovery(){pendingRecovery=null;clearActive();$('recoveryBanner').classList.add('hidden');message('Unsaved timer discarded.')}

  tick=function(now){
    if(!running)return;elapsed=now-startAt;updateTimer();
    if(Date.now()-activeSaveTick>900){activeSaveTick=Date.now();persistActive()}
    raf=requestAnimationFrame(tick)
  };
  toggle=function(){
    if(running){running=false;cancelAnimationFrame(raf);releaseWakeLock();$('startBtn').textContent='▶ Resume';updateTimer();persistActive()}
    else{var problem=updateTimingSummary();if(problem){message(problem);return}running=true;startAt=performance.now()-elapsed;$('startBtn').textContent='Ⅱ Pause';updateTimer();persistActive();requestWakeLock();raf=requestAnimationFrame(tick)}
  };
  reset=function(force){
    if(!force&&preferences.confirmReset&&elapsed>0&&!confirm('This time ('+fmt(elapsed/1000,true)+') has not been saved. Reset it and move it to the recycle bin?'))return false;
    if(!force&&elapsed>0)addRecycle({type:'timer',label:($('participant').value.trim()||'Unsaved timer')+' · '+fmt(elapsed/1000,true),data:activeSnapshot()});
    running=false;cancelAnimationFrame(raf);releaseWakeLock();elapsed=0;lastCue='ready';$('startBtn').textContent='▶ Start timer';clearActive();updateTimer();return true
  };
  saveRecord=function(sec){
    var name=$('participant').value.trim(),p=current(),problem=updateTimingSummary();if(problem){message(problem);return false}if(!name){message('Add the participant name first.');return false}if(sec<.5){message('Enter or run a time before saving the result.');return false}
    var a=assessmentFor(sec,p),agendaId=activeAgendaId;
    records.push({id:Date.now()+Math.random(),name:name,title:$('activity').value.trim(),section:p.section,slot:p.label,role:p.label,seconds:+sec.toFixed(1),green:p.green,amber:p.amber,red:p.red,grace:p.grace,result:a.result,zone:a.zone,agendaItemId:agendaId,competitionMode:$('competitionMode').checked,competitionType:$('competitionMode').checked?$('competitionType').value:''});
    if(agendaId){var agendaItem=agendaQueue.find(function(item){return item.id===agendaId});if(agendaItem)agendaItem.status='done';activeAgendaId=null}
    save();render();reset(true);$('participant').value='';$('activity').value='';$('manualMin').value='';$('manualSec').value='';$('participant').focus();message(p.label+' · '+name+' saved at '+fmt(sec,true));return true
  };

  function addRecycle(item){item.id=makeId('recycle');item.createdAt=Date.now();recycleBin.unshift(item);recycleBin=recycleBin.slice(0,40);safeWrite(RECYCLE_KEY,recycleBin);renderRecycle();message(item.label+' moved to the recycle bin.',true)}
  function undoLast(){if(!recycleBin.length){message('Nothing to undo.');return}restoreRecycle(recycleBin[0].id)}
  function restoreRecycle(id){
    var index=recycleBin.findIndex(function(item){return item.id===id});if(index<0)return;var item=recycleBin[index];
    if(item.type==='record'){var at=Math.min(Math.max(0,Number(item.index)||0),records.length);records.splice(at,0,normaliseRecord(item.data))}
    else if(item.type==='records'){records=item.data.map(normaliseRecord)}
    else if(item.type==='timer')applyTimerState(item.data,false);
    recycleBin.splice(index,1);safeWrite(RECYCLE_KEY,recycleBin);save();render();renderRecycle();message(item.label+' restored.')
  }
  function renderRecycle(){
    if(!$('recycleList'))return;$('recycleCount').textContent=recycleBin.length;
    $('recycleList').innerHTML=recycleBin.length?recycleBin.map(function(item){return'<article class="recycle-item"><div><b>'+esc(item.label)+'</b><span>'+esc(item.type==='timer'?'Unsaved timer':(item.type==='records'?'Complete result list':'Saved timing result'))+'</span><time>'+new Date(item.createdAt).toLocaleString('en-NZ')+'</time></div><div class="item-actions"><button data-restore-recycle="'+esc(item.id)+'">Restore</button></div></article>'}).join(''):'<div class="recycle-empty">The recycle bin is empty. Deleted items are kept for 30 days.</div>';
    $('recycleList').querySelectorAll('[data-restore-recycle]').forEach(function(button){button.onclick=function(){restoreRecycle(button.dataset.restoreRecycle)}})
  }
  function emptyRecycle(){if(!recycleBin.length)return;if(!confirm('Permanently empty the recycle bin? This cannot be undone.'))return;recycleBin=[];safeWrite(RECYCLE_KEY,recycleBin);renderRecycle();message('Recycle bin emptied.')}

  render=function(){
    originalRender();renderAgenda();renderRecycle();renderSavedPresets();
    document.querySelectorAll('[data-remove]').forEach(function(button){button.onclick=function(){var index=Number(button.dataset.remove),record=records[index];if(!record)return;addRecycle({type:'record',label:record.name+' · '+record.slot,data:Object.assign({},record),index:index});records.splice(index,1);save();render()}})
  };

  var COMPETITIONS={
    speech57:{preset:'speech57',section:'Prepared Speeches',role:'Prepared Speech',rule:'Qualification window: 4:30–7:30.'},
    table12:{preset:'table12',section:'Table Topics Speakers',role:'Table Topic',rule:'Qualification window: 1:00–2:30.'},
    eval23:{preset:'eval23',section:'Speech Evaluations',role:'Evaluation',rule:'Qualification window: 1:30–3:30.'}
  };
  function applyCompetitionMode(change){
    var enabled=$('competitionMode').checked,type=$('competitionType').value,item=COMPETITIONS[type]||COMPETITIONS.speech57;
    $('competitionOptions').classList.toggle('hidden',!enabled);$('competitionBadge').classList.toggle('hidden',!enabled);$('competitionRuleText').textContent=item.rule;
    var ids=['preset','greenMin','greenSec','amberMin','amberSec','redMin','redSec','graceMin','graceSec'];ids.forEach(function(id){$(id).disabled=enabled});document.querySelector('.time-inputs').classList.toggle('locked',enabled);
    if(enabled&&change){$('preset').value=item.preset;setTimeInputs(PRESETS[item.preset]);$('section').value=item.section;$('role').value=item.role;$('agendaRole').value='custom';$('customSection').value=item.section;$('customRoleName').value=item.role;$('customRoleFields').classList.remove('hidden');reset(true);refreshRolePreview();updateTimingSummary()}
    save()
  }
  function changeCompetition(){if(elapsed>0&&preferences.confirmReset&&!confirm('The current time has not been saved. Change competition timing and reset it?')){$('competitionMode').checked=!$('competitionMode').checked;return}applyCompetitionMode(true)}
  function changeCompetitionType(){if(elapsed>0&&preferences.confirmReset&&!confirm('The current time has not been saved. Change contest type and reset it?'))return;applyCompetitionMode(true)}
  function openCompetitionLights(){setView('timer');document.body.classList.add('competition-lights','present');document.body.classList.remove('report-present');var exit=$('exitCompetitionLights');if(exit)exit.classList.remove('hidden');if(document.documentElement.requestFullscreen){var request=document.documentElement.requestFullscreen();if(request&&request.catch)request.catch(function(){})}if(running)requestWakeLock()}
  function closeCompetitionLights(){document.body.classList.remove('competition-lights','present');var exit=$('exitCompetitionLights');if(exit)exit.classList.add('hidden');if(document.fullscreenElement&&document.exitFullscreen){var closing=document.exitFullscreen();if(closing&&closing.catch)closing.catch(function(){})}}
  function createLightsExit(){var button=document.createElement('button');button.id='exitCompetitionLights';button.className='competition-lights-exit hidden';button.type='button';button.textContent='× Exit lights';button.onclick=closeCompetitionLights;document.body.appendChild(button)}

  function openToolModal(id){
    var modal=$(id);if(!modal)return;lastToolFocus=document.activeElement;modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');
    if(id==='agendaModal')renderAgenda();if(id==='presetModal')renderSavedPresets();if(id==='recycleModal')renderRecycle();
    var focusable=modal.querySelector('input,select,button:not([disabled])');if(focusable)setTimeout(function(){focusable.focus()},0)
  }
  function closeToolModal(id){var modal=$(id);if(!modal||modal.classList.contains('hidden'))return;modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');if(!document.querySelector('.tool-modal:not(.hidden)')&&$('settingsModal').classList.contains('hidden')&&$('editModal').classList.contains('hidden'))document.body.classList.remove('modal-open');if(lastToolFocus&&lastToolFocus.focus)lastToolFocus.focus()}
  function openToolFromSettings(id){closeSettings();openToolModal(id)}
  function trapToolFocus(e,modal){var focusable=Array.from(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(el){return el.offsetParent!==null});if(!focusable.length)return;var first=focusable[0],last=focusable[focusable.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}

  function printReport(){setView('report');setTimeout(function(){window.print()},120)}
  function backupEverything(){
    var backup={schema:'tm-timing-desk-backup',version:9,exportedAt:new Date().toISOString(),meeting:meetingState(),records:records,agendaQueue:agendaQueue,customPresets:customPresets,meetingTemplates:meetingTemplates,recycleBin:recycleBin,preferences:preferences,activeTimer:elapsed>0?activeSnapshot():null};
    downloadFile((safeName()||'TM-Timing-Desk')+'-'+todayLocal()+'-backup.json','application/json',JSON.stringify(backup,null,2));message('Complete Timing Desk backup downloaded.')
  }
  function restoreBackupFile(file){
    if(!file)return;var reader=new FileReader();reader.onload=function(){
      try{
        var backup=JSON.parse(reader.result);if(!backup||backup.schema!=='tm-timing-desk-backup'||!Array.isArray(backup.records))throw new Error('invalid');
        if(!confirm('Restore this Timing Desk backup? It will replace the current meeting, templates, presets and settings.'))return;
        reset(true);records=backup.records.map(normaliseRecord);customPresets=Array.isArray(backup.customPresets)?backup.customPresets:[];meetingTemplates=Array.isArray(backup.meetingTemplates)?backup.meetingTemplates:[];recycleBin=Array.isArray(backup.recycleBin)?backup.recycleBin:[];agendaQueue=Array.isArray(backup.agendaQueue)?backup.agendaQueue:(backup.meeting&&Array.isArray(backup.meeting.agendaQueue)?backup.meeting.agendaQueue:[]);activeAgendaId=backup.meeting&&backup.meeting.activeAgendaId||null;
        preferences=Object.assign({},DEFAULT_PREFERENCES,backup.preferences||{});savePreferences();applyPreferences();safeWrite(PRESET_KEY,customPresets);safeWrite(TEMPLATE_KEY,meetingTemplates);safeWrite(RECYCLE_KEY,recycleBin);renderPresetOptions();
        var m=backup.meeting||{};if(m.club!==undefined)$('club').value=m.club;if(m.title!==undefined)$('meetingTitle').value=m.title;if(m.date)$('meetingDate').value=m.date;if(m.agendaRole&&optionExists($('agendaRole'),m.agendaRole))$('agendaRole').value=m.agendaRole;if(m.customSection)$('customSection').value=m.customSection;if(m.customRoleName)$('customRoleName').value=m.customRoleName;if(m.preset&&optionExists($('preset'),m.preset))$('preset').value=m.preset;if(m.green!==undefined)setTimeInputs(m);$('competitionMode').checked=!!m.competitionMode;if(m.competitionType&&optionExists($('competitionType'),m.competitionType))$('competitionType').value=m.competitionType;applyCompetitionMode(false);
        if(backup.activeTimer&&Number(backup.activeTimer.elapsedMs)>0)applyTimerState(backup.activeTimer,false);else{clearActive();setAgendaRole(true);updateTimingSummary();updateTimer()}
        save();render();syncPreferenceForm();message('Timing Desk backup restored successfully.')
      }catch(e){alert('That file is not a valid TM Timing Desk backup.')}
      finally{$('restoreFile').value=''}
    };reader.onerror=function(){alert('The backup file could not be read.')};reader.readAsText(file)
  }

  function bindV9(){
    $('startBtn').onclick=toggle;$('logBtn').onclick=addResult;$('manualBtn').onclick=addManualResult;
    $('agendaBuilderBtn').onclick=function(){openToolModal('agendaModal')};$('settingsAgendaBtn').onclick=function(){openToolFromSettings('agendaModal')};
    $('savePresetBtn').onclick=function(){$('presetName').value='';openToolModal('presetModal')};$('managePresetsBtn').onclick=function(){openToolModal('presetModal')};$('settingsPresetsBtn').onclick=function(){openToolFromSettings('presetModal')};
    $('recycleBtn').onclick=function(){openToolModal('recycleModal')};$('settingsRecycleBtn').onclick=function(){openToolFromSettings('recycleModal')};$('emptyRecycleBtn').onclick=emptyRecycle;$('toastUndoBtn').onclick=undoLast;
    document.querySelectorAll('[data-close-tool]').forEach(function(button){button.onclick=function(){closeToolModal(button.dataset.closeTool)}});
    $('captureAgendaBtn').onclick=captureAgenda;$('addAgendaItemBtn').onclick=addAgendaFromForm;$('clearAgendaBtn').onclick=clearAgenda;$('loadNextAgendaBtn').onclick=loadNextAgenda;$('nextAgendaBtn').onclick=loadNextAgenda;
    $('saveTemplateBtn').onclick=saveTemplate;$('loadTemplateBtn').onclick=loadTemplate;$('deleteTemplateBtn').onclick=deleteTemplate;$('confirmSavePresetBtn').onclick=saveCustomPreset;
    $('competitionMode').onchange=changeCompetition;$('competitionType').onchange=changeCompetitionType;$('competitionLightsBtn').onclick=openCompetitionLights;
    $('printBtn').onclick=printReport;$('backupBtn').onclick=backupEverything;$('settingsBackupBtn').onclick=function(){closeSettings();backupEverything()};
    $('restoreBtn').onclick=function(){$('restoreFile').click()};$('settingsRestoreBtn').onclick=function(){closeSettings();$('restoreFile').click()};$('restoreFile').onchange=function(){restoreBackupFile(this.files&&this.files[0])};
    $('recoveryRestoreBtn').onclick=restoreRecovery;$('recoveryDiscardBtn').onclick=discardRecovery;
    $('clearBtn').onclick=function(){if(!records.length)return;if(confirm('Clear every saved timing result? You can restore them from the recycle bin for 30 days.')){addRecycle({type:'records',label:records.length+' saved timing results',data:records.map(function(item){return Object.assign({},item)})});records=[];save();render()}};
    $('newMeetingBtn').onclick=function(){
      if(records.length&&!confirm('Start a new meeting and clear the current timing results? The results will be kept in the recycle bin.'))return;
      if(elapsed>0&&preferences.confirmReset&&!confirm('The current time ('+fmt(elapsed/1000,true)+') has not been saved. Start a new meeting and move it to the recycle bin?'))return;
      if(records.length)addRecycle({type:'records',label:records.length+' results from '+meetingName(),data:records.map(function(item){return Object.assign({},item)})});if(elapsed>0)addRecycle({type:'timer',label:($('participant').value.trim()||'Unsaved timer')+' · '+fmt(elapsed/1000,true),data:activeSnapshot()});
      reset(true);records=[];agendaQueue=[];activeAgendaId=null;$('meetingTitle').value='Club Meeting';$('meetingDate').value=todayLocal();$('competitionMode').checked=false;applyCompetitionMode(false);save();render();setView('timer');message('New meeting ready.')
    };
    window.addEventListener('pagehide',function(){if(elapsed>0)persistActive()});
    document.addEventListener('fullscreenchange',function(){if(!document.fullscreenElement&&document.body.classList.contains('competition-lights'))closeCompetitionLights()});
    document.addEventListener('keydown',function(e){var modal=document.querySelector('.tool-modal:not(.hidden)');if(e.key==='Escape'){if(modal){closeToolModal(modal.id);return}if(document.body.classList.contains('competition-lights')){closeCompetitionLights();return}}if(modal&&e.key==='Tab')trapToolFocus(e,modal)});
  }

  loadV9Data();createLightsExit();bindV9();applyCompetitionMode(false);render();checkRecovery();updateTimingSummary();updateTimer()
})();
