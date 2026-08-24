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
  var agendaEditingId=null;
  var agendaAdvanceTimer=0;
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
    updateTimingSummary();updateTimer();save();if(elapsed>0)persistActive();
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

  function agendaPair(prefix){return(Math.max(0,Number($(prefix+'Min').value)||0)*60)+Math.max(0,Number($(prefix+'Sec').value)||0)}
  function setAgendaPair(prefix,total){total=Math.max(0,Math.round(Number(total)||0));$(prefix+'Min').value=Math.floor(total/60);$(prefix+'Sec').value=total%60}
  function agendaFormTiming(){return{green:agendaPair('agendaGreen'),amber:agendaPair('agendaAmber'),red:agendaPair('agendaRed'),grace:agendaPair('agendaGrace')}}
  function setAgendaFormTiming(p){setAgendaPair('agendaGreen',p.green);setAgendaPair('agendaAmber',p.amber);setAgendaPair('agendaRed',p.red);setAgendaPair('agendaGrace',p.grace)}
  function agendaTimingProblem(p){var prefixes=['agendaGreen','agendaAmber','agendaRed','agendaGrace'];for(var i=0;i<prefixes.length;i++){var min=Number($(prefixes[i]+'Min').value),sec=Number($(prefixes[i]+'Sec').value);if(!Number.isFinite(min)||min<0||min>99||Math.floor(min)!==min)return'Use whole minutes from 0 to 99.';if(!Number.isFinite(sec)||sec<0||sec>=60||Math.floor(sec)!==sec)return'Seconds must be a whole number from 0 to 59.'}if(p.green<=0)return'Green must be later than 00:00.';if(p.amber<p.green)return'Yellow must be the same as or later than green.';if(p.red<p.amber)return'Red must be the same as or later than yellow.';return''}
  function syncAgendaPreset(){var key=$('agendaItemPreset').value,p=getTimingPreset(key);$('agendaCustomTiming').classList.toggle('hidden',key!=='custom');if(p)setAgendaFormTiming(p)}
  function resetAgendaForm(){agendaEditingId=null;$('agendaFormHeading').textContent='Add an agenda item';$('agendaItemName').value='';$('agendaItemTitle').value='';$('agendaItemSection').value='Prepared Speeches';$('agendaItemRole').value='Prepared Speech';$('agendaItemPreset').value='speech57';$('agendaItemRepeatable').checked=false;$('agendaItemReportable').checked=true;$('addAgendaItemBtn').textContent='＋ Add to agenda';$('cancelAgendaEditBtn').classList.add('hidden');syncAgendaPreset()}
  function agendaItemFromTimer(){var p=current();return{id:makeId('agenda'),name:$('participant').value.trim(),title:$('activity').value.trim(),section:p.section,role:p.label,preset:$('preset').value,green:p.green,amber:p.amber,red:p.red,grace:p.grace,status:'pending',repeatable:false,reportable:true}}
  function agendaItemFromForm(){var key=$('agendaItemPreset').value,p=key==='custom'?agendaFormTiming():(getTimingPreset(key)||PRESETS.speech57);return{id:agendaEditingId||makeId('agenda'),name:$('agendaItemName').value.trim(),title:$('agendaItemTitle').value.trim(),section:$('agendaItemSection').value.trim()||'Other Roles',role:$('agendaItemRole').value.trim()||'Meeting Role',preset:key,green:p.green,amber:p.amber,red:p.red,grace:p.grace,status:'pending',repeatable:$('agendaItemRepeatable').checked,reportable:$('agendaItemReportable').checked}}
  function agendaName(item){return item.name||item.role||'Agenda item'}
  function addAgendaItem(item){agendaQueue.push(item);save();renderAgenda();message(agendaName(item)+' added to the optional agenda.');return true}
  function captureAgenda(){addAgendaItem(agendaItemFromTimer());resetAgendaForm()}
  function addAgendaFromForm(){var item=agendaItemFromForm(),problem=agendaTimingProblem(item);if(problem){message(problem);return}if(agendaEditingId){var index=agendaQueue.findIndex(function(entry){return entry.id===agendaEditingId});if(index>=0){item.status=agendaQueue[index].status||'pending';agendaQueue[index]=item}message(agendaName(item)+' agenda item updated.')}else addAgendaItem(item);save();renderAgenda();resetAgendaForm();$('agendaItemName').focus()}
  function editAgendaItem(id){var item=agendaQueue.find(function(entry){return entry.id===id});if(!item)return;agendaEditingId=id;$('agendaFormHeading').textContent='Edit agenda item';$('agendaItemName').value=item.name||'';$('agendaItemTitle').value=item.title||'';$('agendaItemSection').value=item.section||'';$('agendaItemRole').value=item.role||'';$('agendaItemPreset').value=optionExists($('agendaItemPreset'),item.preset)?item.preset:'custom';$('agendaItemRepeatable').checked=!!item.repeatable;$('agendaItemReportable').checked=item.reportable!==false;setAgendaFormTiming(item);$('agendaCustomTiming').classList.toggle('hidden',$('agendaItemPreset').value!=='custom');$('addAgendaItemBtn').textContent='✓ Save agenda changes';$('cancelAgendaEditBtn').classList.remove('hidden');$('agendaItemName').focus()}
  function findAgendaRole(section,role){return Object.keys(AGENDA_ROLES).find(function(key){return AGENDA_ROLES[key].section===section&&AGENDA_ROLES[key].label===role})||'custom'}
  function loadAgendaItem(id){var item=agendaQueue.find(function(x){return x.id===id});if(!item)return false;if(elapsed>0&&preferences.confirmReset&&!confirm('The current time ('+fmt(elapsed/1000,true)+') has not been saved. Load '+agendaName(item)+' without saving it?'))return false;reset(true);$('participant').value=item.repeatable?'':(item.name||'');$('activity').value=item.repeatable?'':(item.title||'');$('section').value=item.section;$('role').value=item.role;var roleKey=findAgendaRole(item.section,item.role);$('agendaRole').value=roleKey;if(roleKey==='custom'){$('customSection').value=item.section;$('customRoleName').value=item.role;$('customRoleFields').classList.remove('hidden')}else $('customRoleFields').classList.add('hidden');if(optionExists($('preset'),item.preset))$('preset').value=item.preset;else $('preset').value='custom';setTimeInputs(item);agendaQueue.forEach(function(entry){if(entry.status==='active')entry.status='pending'});item.status='active';activeAgendaId=item.id;save();refreshRolePreview();updateTimingSummary();renderAgenda();closeToolModal('agendaModal');$('participant').focus();message(item.repeatable?'Random Table Topics mode ready. Enter each speaker as they are called.':agendaName(item)+' loaded from the agenda.');return true}
  function loadNextAgenda(){clearTimeout(agendaAdvanceTimer);var active=agendaQueue.find(function(item){return item.id===activeAgendaId});if(active){if(elapsed>0&&preferences.confirmReset&&!confirm('The current time ('+fmt(elapsed/1000,true)+') has not been saved. Mark this agenda item complete and continue?'))return;reset(true);active.status='done';activeAgendaId=null}var next=agendaQueue.find(function(item){return item.status==='pending'});if(!next){save();renderAgenda();message(agendaQueue.length?'The agenda queue is complete.':'The optional agenda is empty.');return}save();loadAgendaItem(next.id)}
  function autoLoadNextAgenda(){var next=agendaQueue.find(function(item){return item.status==='pending'});if(!next){message('Result saved — the agenda queue is complete.');return}agendaAdvanceTimer=setTimeout(function(){loadAgendaItem(next.id)},450)}
  function moveAgenda(id,direction){var index=agendaQueue.findIndex(function(item){return item.id===id}),next=index+direction;if(index<0||next<0||next>=agendaQueue.length)return;var item=agendaQueue.splice(index,1)[0];agendaQueue.splice(next,0,item);save();renderAgenda()}
  function deleteAgendaItem(id){var index=agendaQueue.findIndex(function(item){return item.id===id});if(index<0)return;var item=agendaQueue[index];if(!confirm('Remove '+agendaName(item)+' from the optional agenda?'))return;agendaQueue.splice(index,1);if(activeAgendaId===id)activeAgendaId=null;if(agendaEditingId===id)resetAgendaForm();save();renderAgenda();message('Agenda item removed.')}
  function clearAgenda(){if(!agendaQueue.length)return;if(!confirm('Clear the optional agenda queue? Saved timing results will not be affected.'))return;agendaQueue=[];activeAgendaId=null;resetAgendaForm();save();renderAgenda();message('Agenda queue cleared.')}
  function agendaPresetItem(section,role,preset,extra){var p=PRESETS[preset]||PRESETS.role12;return Object.assign({id:makeId('agenda'),name:'',title:'',section:section,role:role,preset:preset,green:p.green,amber:p.amber,red:p.red,grace:p.grace,status:'pending',repeatable:false,reportable:true},extra||{})}
  function avonAgendaItems(){return[
    agendaPresetItem('Meeting Opening','President Opens Meeting','role12'),
    agendaPresetItem('Officer Introductions','Grammarian Introduction','role12'),agendaPresetItem('Officer Introductions','Timer Introduction','role12'),agendaPresetItem('Officer Introductions','Presentations Officer Introduction','role12'),agendaPresetItem('Officer Introductions','General Evaluator Introduction','role12'),
    agendaPresetItem('Introductions','First Speaker Introduction','intro23'),agendaPresetItem('Prepared Speeches','First Speaker','speech57'),agendaPresetItem('Prepared Speeches','Second Speaker','speech57'),
    agendaPresetItem('Break','Supper Break','break10',{reportable:false,title:'10-minute break'}),
    agendaPresetItem('Speech Evaluations','Speech Evaluation 1','eval23'),agendaPresetItem('Speech Evaluations','Speech Evaluation 2','eval23'),
    agendaPresetItem('Table Topics','Table Topicsmaster','topicsmaster10'),agendaPresetItem('Table Topics Speakers','Table Topic Speaker','table12',{repeatable:true,title:'Enter each random speaker as called'}),agendaPresetItem('Table Topics Evaluations','Table Topics Evaluator','tableeval5'),
    agendaPresetItem('Voting','Voting and Slips','vote13',{reportable:false,title:'Normally not timed or reported'}),
    agendaPresetItem('Officer Reports','Grammarian Report','role12'),agendaPresetItem('Officer Reports','Timer Report','role12'),agendaPresetItem('Officer Reports','General Evaluator Report','generaleval45'),agendaPresetItem('Officer Reports','Presentations Officer Report','role12'),agendaPresetItem('Meeting Close','President Notices, Awards and Close','role12')
  ]}
  function loadAvonTemplate(openBuilder){if(elapsed>0&&preferences.confirmReset&&!confirm('The current time ('+fmt(elapsed/1000,true)+') has not been saved. Clear it and load the Avon Toastmasters agenda?'))return false;if(agendaQueue.length&&!confirm('Replace the current optional agenda with the Avon Toastmasters template?'))return false;reset(true);agendaQueue=avonAgendaItems();activeAgendaId=null;$('club').value='Avon Toastmasters';$('meetingTitle').value='Club Meeting';save();renderAgenda();message('Avon Toastmasters agenda loaded. Add names or edit any item.');if(openBuilder)openToolModal('agendaModal');return true}
  function renderAgenda(){var count=$('agendaCount');if(!count)return;count.textContent=agendaQueue.length;var done=agendaQueue.filter(function(item){return item.status==='done'}).length,active=agendaQueue.find(function(item){return item.id===activeAgendaId}),pending=agendaQueue.length-done-(active?1:0);$('agendaNav').classList.toggle('hidden',!agendaQueue.length);$('nextAgendaBtn').textContent=active&&active.repeatable?'Finish Table Topics and load next →':'Next agenda item →';$('agendaProgress').textContent=active?('Timing '+agendaName(active)+' · '+done+' of '+agendaQueue.length+' complete'):(done+' of '+agendaQueue.length+' complete · '+Math.max(0,pending)+' waiting');$('agendaListSummary').textContent=agendaQueue.length?(done+' complete · '+Math.max(0,pending)+' waiting'+(active?' · 1 active':'')):'No agenda items yet.';$('agendaList').innerHTML=agendaQueue.length?agendaQueue.map(function(item,index){var status=item.status||'pending',badges=[status];if(item.repeatable)badges.push('random speakers');if(item.reportable===false)badges.push('not reported');return'<article class="agenda-item '+esc(status)+'"><div><b>'+(index+1)+'. '+esc(agendaName(item))+'</b><span>'+esc(item.section+(item.title?' · '+item.title:''))+'</span><span>'+esc(describeTiming(item))+'</span><small>'+esc(badges.join(' · '))+'</small></div><div class="item-actions"><button data-load-agenda="'+esc(item.id)+'">Load</button><button data-edit-agenda="'+esc(item.id)+'">Edit</button><button data-move-agenda="'+esc(item.id)+'" data-direction="-1" aria-label="Move up">↑</button><button data-move-agenda="'+esc(item.id)+'" data-direction="1" aria-label="Move down">↓</button><button class="danger" data-delete-agenda="'+esc(item.id)+'">Delete</button></div></article>'}).join(''):'<div class="agenda-empty">Agenda building is optional. Load the Avon template, add an item, or close this window and use the normal timer.</div>';$('agendaList').querySelectorAll('[data-load-agenda]').forEach(function(button){button.onclick=function(){loadAgendaItem(button.dataset.loadAgenda)}});$('agendaList').querySelectorAll('[data-edit-agenda]').forEach(function(button){button.onclick=function(){editAgendaItem(button.dataset.editAgenda)}});$('agendaList').querySelectorAll('[data-move-agenda]').forEach(function(button){button.onclick=function(){moveAgenda(button.dataset.moveAgenda,Number(button.dataset.direction))}});$('agendaList').querySelectorAll('[data-delete-agenda]').forEach(function(button){button.onclick=function(){deleteAgendaItem(button.dataset.deleteAgenda)}});renderTemplates()}
  function saveTemplate(){var name=$('templateName').value.trim();if(!name){message('Add a template name first.');$('templateName').focus();return}if(!agendaQueue.length){message('Add at least one agenda item before saving a template.');return}var existing=meetingTemplates.find(function(item){return item.name.toLowerCase()===name.toLowerCase()}),data={name:name,club:$('club').value,title:$('meetingTitle').value,items:agendaQueue.map(function(item){return Object.assign({},item,{status:'pending'})}),updatedAt:Date.now()};if(existing)Object.assign(existing,data);else{data.id=makeId('template');data.createdAt=Date.now();meetingTemplates.push(data)}safeWrite(TEMPLATE_KEY,meetingTemplates);$('templateName').value='';renderTemplates();message(name+' meeting template saved.')}
  function loadTemplate(){var id=$('templateSelect').value;if(id==='builtin-avon'){loadAvonTemplate(false);return}var item=meetingTemplates.find(function(x){return x.id===id});if(!item){message('Choose a saved meeting template.');return}if(agendaQueue.length&&!confirm('Replace the current optional agenda with “'+item.name+'”?'))return;agendaQueue=item.items.map(function(entry){return Object.assign({},entry,{id:makeId('agenda'),status:'pending'})});activeAgendaId=null;if(item.club)$('club').value=item.club;if(item.title)$('meetingTitle').value=item.title;save();renderAgenda();message(item.name+' template loaded.')}
  function deleteTemplate(){var id=$('templateSelect').value;if(id==='builtin-avon'){message('The built-in Avon template stays available. Edit the loaded queue and save your own copy.');return}var item=meetingTemplates.find(function(x){return x.id===id});if(!item){message('Choose a saved meeting template.');return}if(!confirm('Delete the meeting template “'+item.name+'”?'))return;meetingTemplates=meetingTemplates.filter(function(x){return x.id!==id});safeWrite(TEMPLATE_KEY,meetingTemplates);renderTemplates();message('Meeting template deleted.')}
  function renderTemplates(){var select=$('templateSelect');if(!select)return;var selected=select.value;select.innerHTML='<option value="">Choose a saved template</option><option value="builtin-avon">★ Avon Toastmasters regular meeting · 20 items</option>'+meetingTemplates.map(function(item){return'<option value="'+esc(item.id)+'">'+esc(item.name)+' · '+item.items.length+' items</option>'}).join('');if(optionExists(select,selected))select.value=selected}

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
    var agendaId=activeAgendaId,agendaItem=agendaQueue.find(function(item){return item.id===agendaId}),name=$('participant').value.trim(),p=current(),problem=updateTimingSummary();if(problem){message(problem);return false}if(!name&&agendaItem&&agendaItem.reportable===false)name=agendaName(agendaItem);if(!name){message('Add the participant name first.');return false}if(sec<.5){message('Enter or run a time before saving the result.');return false}
    var a=assessmentFor(sec,p),reportable=!agendaItem||agendaItem.reportable!==false;
    if(reportable)records.push({id:Date.now()+Math.random(),name:name,title:$('activity').value.trim(),section:p.section,slot:p.label,role:p.label,seconds:+sec.toFixed(1),green:p.green,amber:p.amber,red:p.red,grace:p.grace,result:a.result,zone:a.zone,agendaItemId:agendaId,competitionMode:$('competitionMode').checked,competitionType:$('competitionMode').checked?$('competitionType').value:''});
    if(agendaItem&&agendaItem.repeatable){agendaItem.status='active';save();render();reset(true);$('participant').value='';$('activity').value='';$('manualMin').value='';$('manualSec').value='';$('participant').focus();message(name+' saved at '+fmt(sec,true)+' — ready for the next random Table Topics speaker.');return true}
    if(agendaItem){agendaItem.status='done';activeAgendaId=null}
    save();render();reset(true);$('participant').value='';$('activity').value='';$('manualMin').value='';$('manualSec').value='';$('participant').focus();message(reportable?(p.label+' · '+name+' saved at '+fmt(sec,true)):(agendaName(agendaItem)+' completed — not added to the report.'));if(agendaItem)autoLoadNextAgenda();return true
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
    speech57:{preset:'speech57',section:'Prepared Speeches',role:'Prepared Speech',rule:'Disqualification: under 04:30 or over 07:30.'},
    table12:{preset:'table12',section:'Table Topics Speakers',role:'Table Topic',rule:'Disqualification: under 00:30 or over 02:30.'},
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
    var backup={schema:'tm-timing-desk-backup',version:9.5,exportedAt:new Date().toISOString(),meeting:meetingState(),records:records,agendaQueue:agendaQueue,customPresets:customPresets,meetingTemplates:meetingTemplates,recycleBin:recycleBin,preferences:preferences,activeTimer:elapsed>0?activeSnapshot():null};
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

  var TRANSFER_ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var transferExpiryAt=0;
  var transferExpiryTimer=0;
  function transferStatus(text,type){var status=$('transferStatus');status.textContent=text||'';status.classList.remove('success','error');if(type)status.classList.add(type)}
  function connectionStatus(text,type){var status=$('transferConnection');status.textContent=text;status.classList.remove('ready','error');if(type)status.classList.add(type)}
  function normaliseTransferCode(value){return String(value||'').toUpperCase().replace(/[^A-HJ-NP-Z2-9]/g,'').slice(0,10)}
  function formatTransferCode(value){var code=normaliseTransferCode(value),parts=[];if(code.slice(0,4))parts.push(code.slice(0,4));if(code.slice(4,8))parts.push(code.slice(4,8));if(code.slice(8,10))parts.push(code.slice(8,10));return parts.join('-')}
  function randomTransferCode(){var bytes=new Uint8Array(10);crypto.getRandomValues(bytes);return Array.from(bytes).map(function(value){return TRANSFER_ALPHABET[value%TRANSFER_ALPHABET.length]}).join('')}
  function bytesToBase64(bytes){var binary='',step=32768;for(var i=0;i<bytes.length;i+=step)binary+=String.fromCharCode.apply(null,bytes.subarray(i,i+step));return btoa(binary)}
  function base64ToBytes(value){var binary=atob(value),bytes=new Uint8Array(binary.length);for(var i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);return bytes}
  async function transferToken(code){var digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('TM-Timing-Desk-transfer:'+code));return Array.from(new Uint8Array(digest)).map(function(value){return value.toString(16).padStart(2,'0')}).join('')}
  async function transferKey(code,salt,usage){var material=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt,iterations:120000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,usage)}
  async function encryptTransfer(data,code){var salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await transferKey(code,salt,['encrypt']),plain=new TextEncoder().encode(JSON.stringify(data)),encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv:iv},key,plain);return JSON.stringify({v:1,s:bytesToBase64(salt),i:bytesToBase64(iv),d:bytesToBase64(new Uint8Array(encrypted))})}
  async function decryptTransfer(payload,code){try{var packed=JSON.parse(payload);if(!packed||packed.v!==1||!packed.s||!packed.i||!packed.d)throw new Error('invalid-transfer');var salt=base64ToBytes(packed.s),iv=base64ToBytes(packed.i),key=await transferKey(code,salt,['decrypt']),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:iv},key,base64ToBytes(packed.d));var data=JSON.parse(new TextDecoder().decode(plain));if(!data||data.schema!=='tm-timing-desk-transfer'||!Array.isArray(data.records)||!data.meeting)throw new Error('invalid-transfer');return data}catch(e){throw new Error('invalid-transfer')}}
  async function transferRequest(path,body){var options={method:body?'POST':'GET',headers:{Accept:'application/json'},cache:'no-store',credentials:'same-origin'};if(body){options.headers['Content-Type']='application/json';options.body=JSON.stringify(body)}var response=await fetch(path,options),data=null;try{data=await response.json()}catch(e){throw new Error(response.redirected?'Please sign in to Cloudflare Access, then try again.':'The transfer service returned an unexpected response.')}if(!response.ok)throw new Error(data&&data.error||'The transfer service is unavailable.');return data}
  function transferSupported(){return!!(window.isSecureContext&&window.crypto&&crypto.subtle&&crypto.getRandomValues)}
  function transferSnapshot(scope){var timer=activeSnapshot();timer.running=false;timer.wallStartedAt=null;var snapshot={schema:'tm-timing-desk-transfer',version:9.5,createdAt:new Date().toISOString(),scope:scope,meeting:meetingState(),records:records.map(function(item){return Object.assign({},item)}),agendaQueue:agendaQueue.map(function(item){return Object.assign({},item)}),activeTimer:timer};if(scope==='everything'){snapshot.customPresets=customPresets;snapshot.meetingTemplates=meetingTemplates;snapshot.recycleBin=recycleBin;snapshot.preferences=readPreferenceForm()}return snapshot}
  function updateTransferExpiry(){clearTimeout(transferExpiryTimer);if(!transferExpiryAt)return;var remaining=Math.max(0,transferExpiryAt-Date.now()),expiry=$('transferExpiry');if(!remaining){expiry.textContent='This code has expired.';transferStatus('Create a new code to transfer the latest data.','error');return}var minutes=Math.floor(remaining/60000),seconds=Math.floor(remaining%60000/1000);expiry.textContent='Expires in '+String(minutes).padStart(2,'0')+':'+String(seconds).padStart(2,'0')+' and works once.';transferExpiryTimer=setTimeout(updateTransferExpiry,1000)}
  async function checkTransferConnection(){var button=$('checkTransferBtn');button.disabled=true;connectionStatus('Checking the secure transfer connection…');try{if(!navigator.onLine)throw new Error('This device is offline. Connect to the internet and try again.');var result=await transferRequest('/api/transfer/health');connectionStatus(result.ok?'Connected. Encrypted one-time transfers are ready.':'The transfer service is not ready.',result.ok?'ready':'error')}catch(e){connectionStatus(e.message,'error')}finally{button.disabled=false}}
  async function createTransferCode(){var button=$('createTransferBtn');if(!transferSupported()){transferStatus('Secure transfer needs a current browser on the HTTPS website.','error');return}if(!navigator.onLine){transferStatus('This device is offline. Connect to the internet to create a code.','error');return}button.disabled=true;button.textContent='Encrypting…';transferStatus('Preparing an encrypted one-time transfer…');try{var scope=$('transferScope').value==='everything'?'everything':'meeting',snapshot=transferSnapshot(scope),created=null,code='';for(var attempt=0;attempt<3&&!created;attempt++){code=randomTransferCode();var payload=await encryptTransfer(snapshot,code),token=await transferToken(code);try{created=await transferRequest('/api/transfer/create',{token:token,payload:payload})}catch(e){if(e.message!=='Please create another code and try again.'||attempt===2)throw e}}if(!created)throw new Error('A transfer code could not be created. Please try again.');$('transferCode').textContent=formatTransferCode(code);$('transferCodePanel').classList.remove('hidden');transferExpiryAt=Number(created.expiresAt)||Date.now()+10*60*1000;updateTransferExpiry();transferStatus('Code created. Type it on the other device before it expires.','success')}catch(e){transferStatus(e.message||'The transfer code could not be created.','error')}finally{button.disabled=false;button.textContent='Create transfer code'}}
  async function copyTransferCode(){var code=$('transferCode').textContent.trim();if(!code)return;try{if(navigator.clipboard&&navigator.clipboard.writeText)await navigator.clipboard.writeText(code);else{var area=document.createElement('textarea');area.value=code;area.setAttribute('readonly','');area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}transferStatus('Transfer code copied.','success')}catch(e){transferStatus('Could not copy automatically. Select or write down the displayed code.','error')}}
  function transferPreviewText(data){var meeting=data.meeting||{},agenda=Array.isArray(data.agendaQueue)?data.agendaQueue:[],timer=data.activeTimer&&Number(data.activeTimer.elapsedMs)>0?' It also contains a paused timer at '+fmt(Number(data.activeTimer.elapsedMs)/1000,true)+'.':'';return'Load “'+(meeting.title||'Club Meeting')+'”'+(meeting.club?' for '+meeting.club:'')+'?\n\n'+data.records.length+' saved result(s) and '+agenda.length+' agenda item(s).'+timer+(data.scope==='everything'?' Saved settings, presets, templates and recycle-bin items will also be replaced.':'')+'\n\nYour current meeting data will be replaced. Existing results will be kept in the recycle bin.'}
  function archiveBeforeTransfer(){var kept=[];if(records.length)kept.push({id:makeId('recycle'),createdAt:Date.now(),type:'records',label:records.length+' results before device transfer',data:records.map(function(item){return Object.assign({},item)})});if(elapsed>0)kept.push({id:makeId('recycle'),createdAt:Date.now(),type:'timer',label:($('participant').value.trim()||'Unsaved timer')+' before device transfer',data:activeSnapshot()});return kept}
  function applyTransferredData(data){var preserved=archiveBeforeTransfer(),everything=data.scope==='everything',m=data.meeting||{};reset(true);records=data.records.map(function(item){return normaliseRecord(Object.assign({},item))});agendaQueue=(Array.isArray(data.agendaQueue)?data.agendaQueue:(Array.isArray(m.agendaQueue)?m.agendaQueue:[])).map(function(item){return Object.assign({},item)});activeAgendaId=m.activeAgendaId||null;if(everything){customPresets=Array.isArray(data.customPresets)?data.customPresets:[];meetingTemplates=Array.isArray(data.meetingTemplates)?data.meetingTemplates:[];recycleBin=preserved.concat(Array.isArray(data.recycleBin)?data.recycleBin:[]).slice(0,40);preferences=Object.assign({},DEFAULT_PREFERENCES,data.preferences||{});savePreferences();applyPreferences()}else recycleBin=preserved.concat(recycleBin).slice(0,40);safeWrite(PRESET_KEY,customPresets);safeWrite(TEMPLATE_KEY,meetingTemplates);safeWrite(RECYCLE_KEY,recycleBin);renderPresetOptions();if(m.club!==undefined)$('club').value=m.club;if(m.title!==undefined)$('meetingTitle').value=m.title;if(m.date)$('meetingDate').value=m.date;if(m.agendaRole&&optionExists($('agendaRole'),m.agendaRole))$('agendaRole').value=m.agendaRole;if(m.customSection!==undefined)$('customSection').value=m.customSection;if(m.customRoleName!==undefined)$('customRoleName').value=m.customRoleName;if(m.preset&&optionExists($('preset'),m.preset))$('preset').value=m.preset;if(m.green!==undefined)setTimeInputs(m);$('competitionMode').checked=!!m.competitionMode;if(m.competitionType&&optionExists($('competitionType'),m.competitionType))$('competitionType').value=m.competitionType;applyCompetitionMode(false);if(data.activeTimer){data.activeTimer.running=false;applyTimerState(data.activeTimer,false)}else{clearActive();setAgendaRole(true);updateTimingSummary();updateTimer()}save();render();syncPreferenceForm();renderAgenda();setView('timer');closeSettings()}
  async function loadTransferCode(){var button=$('loadTransferBtn'),code=normaliseTransferCode($('transferCodeInput').value);if(code.length!==10){transferStatus('Enter the complete 10-character transfer code.','error');$('transferCodeInput').focus();return}if(!transferSupported()){transferStatus('Secure transfer needs a current browser on the HTTPS website.','error');return}if(!navigator.onLine){transferStatus('This device is offline. Connect to the internet to load a code.','error');return}button.disabled=true;button.textContent='Checking…';transferStatus('Decrypting a private preview…');try{var token=await transferToken(code),preview=await transferRequest('/api/transfer/load',{token:token,consume:false}),data=await decryptTransfer(preview.payload,code);if(!confirm(transferPreviewText(data))){transferStatus('Transfer cancelled. The code can still be used before it expires.');return}button.textContent='Loading…';var consumed=await transferRequest('/api/transfer/load',{token:token,consume:true}),finalData=await decryptTransfer(consumed.payload,code);applyTransferredData(finalData);message('Transferred meeting loaded. Any transferred timer is paused for safety.')}catch(e){transferStatus(e.message==='invalid-transfer'?'That transfer could not be decrypted. Check the code and try again.':(e.message||'The transfer could not be loaded.'),'error')}finally{button.disabled=false;button.textContent='Preview and load'}}

  function randomBetween(min,max){return+(min+Math.random()*(max-min)).toFixed(1)}
  function shuffled(list){var copy=list.slice();for(var i=copy.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),value=copy[i];copy[i]=copy[j];copy[j]=value}return copy}
  function generateSampleMeeting(){
    if(records.length&&!confirm('Replace the current report with a fresh random sample meeting? Your current results will be moved to the recycle bin.'))return;
    if(records.length)addRecycle({type:'records',label:records.length+' results before sample meeting',data:records.map(function(item){return Object.assign({},item)})});
    reset(true);var names=shuffled(['Aroha','Ben','Charlotte','Daniel','Emma','Finn','Grace','Hemi','Isla','Jack','Kiri','Leo','Maia','Noah','Olivia','Priya','Quinn','Ruby','Sam','Talia','Wiremu','Zoe','Anika','Caleb','Mila','Theo']),nameIndex=0,titles=shuffled(['A Small Act of Courage','Finding the Next Trail','The Unexpected Detour','Lessons from the Garden','One More Step','Turning Doubt into Action','The Day Everything Changed','Listening Before Leading']);
    function nextName(){return names[nameIndex++%names.length]}
    function sample(section,slot,title,seconds,preset){var p=PRESETS[preset];return{id:Date.now()+Math.random(),section:section,slot:slot,role:slot,name:nextName(),title:title||'',seconds:seconds,green:p.green,amber:p.amber,red:p.red,grace:p.grace}}
    records=[
      sample('Meeting Opening','President Opens Meeting','Welcome and club notices',randomBetween(65,112),'role12'),
      sample('Officer Introductions','Grammarian Introduction','Word of the day',randomBetween(62,118),'role12'),
      sample('Officer Introductions','Timer Introduction','Timing signals explained',randomBetween(48,92),'role12'),
      sample('Officer Introductions','Presentations Officer Introduction','Awards and voting process',randomBetween(70,132),'role12'),
      sample('Introductions','First Speaker Introduction','Introducing '+names[8],randomBetween(125,175),'intro23'),
      sample('Prepared Speeches','Prepared Speech 1',titles[0],randomBetween(315,405),'speech57'),
      sample('Prepared Speeches','Prepared Speech 2',titles[1],randomBetween(238,267),'speech57'),
      sample('Prepared Speeches','Prepared Speech 3',titles[2],randomBetween(452,485),'speech57'),
      sample('Speech Evaluations','Speech Evaluation 1','Evaluation of '+titles[0],randomBetween(125,175),'eval23'),
      sample('Speech Evaluations','Speech Evaluation 2','Evaluation of '+titles[1],randomBetween(72,88),'eval23'),
      sample('Speech Evaluations','Speech Evaluation 3','Evaluation of '+titles[2],randomBetween(212,238),'eval23'),
      sample('Table Topics','Table Topicsmaster','Theme: Unexpected opportunities',randomBetween(540,620),'topicsmaster10'),
      sample('Table Topics Speakers','Table Topic 1','A surprising invitation',randomBetween(18,28),'table12'),
      sample('Table Topics Speakers','Table Topic 2','The best advice I received',randomBetween(72,112),'table12'),
      sample('Table Topics Speakers','Table Topic 3','A memorable journey',randomBetween(123,144),'table12'),
      sample('Table Topics Speakers','Table Topic 4','An unusual invention',randomBetween(151,172),'table12'),
      sample('Table Topics Speakers','Table Topic 5','My perfect weekend',randomBetween(65,118),'table12'),
      sample('Table Topics Speakers','Table Topic 6','A skill I would learn overnight',randomBetween(31,59),'table12'),
      sample('Table Topics Speakers','Table Topic 7','The funniest misunderstanding',randomBetween(78,119),'table12'),
      sample('Table Topics Speakers','Table Topic 8','A place everyone should visit',randomBetween(121,148),'table12'),
      sample('Table Topics Speakers','Table Topic 9','One rule I would change',randomBetween(155,176),'table12'),
      sample('Table Topics Evaluations','Table Topics Evaluator','Evaluation of the Table Topics session',randomBetween(270,325),'tableeval5'),
      sample('Officer Reports','Grammarian Report','Language and word usage',randomBetween(70,118),'role12'),
      sample('Officer Reports','Timer Report','Meeting timing summary',randomBetween(55,135),'role12'),
      sample('Officer Reports','General Evaluator Report','Overall meeting evaluation',randomBetween(245,298),'generaleval45'),
      sample('Officer Reports','Presentations Officer Report','Awards and voting results',randomBetween(65,118),'role12'),
      sample('Meeting Close','President Notices, Awards and Close','Meeting close',randomBetween(60,125),'role12')
    ].map(normaliseRecord);
    $('meetingTitle').value='Sample Timing Meeting';$('meetingDate').value=todayLocal();save();render();setView('report');message('Sample created with Table Topics 1–9 and a two-slide Table Topics PowerPoint report.')
  }

  function bindV9(){
    $('startBtn').onclick=toggle;$('logBtn').onclick=addResult;$('manualBtn').onclick=addManualResult;
    $('agendaBuilderBtn').onclick=function(){openToolModal('agendaModal')};$('settingsAgendaBtn').onclick=function(){openToolFromSettings('agendaModal')};
    $('savePresetBtn').onclick=function(){$('presetName').value='';openToolModal('presetModal')};$('managePresetsBtn').onclick=function(){openToolModal('presetModal')};$('settingsPresetsBtn').onclick=function(){openToolFromSettings('presetModal')};
    $('recycleBtn').onclick=function(){openToolModal('recycleModal')};$('settingsRecycleBtn').onclick=function(){openToolFromSettings('recycleModal')};$('emptyRecycleBtn').onclick=emptyRecycle;$('toastUndoBtn').onclick=undoLast;
    document.querySelectorAll('[data-close-tool]').forEach(function(button){button.onclick=function(){closeToolModal(button.dataset.closeTool)}});
    $('captureAgendaBtn').onclick=captureAgenda;$('addAgendaItemBtn').onclick=addAgendaFromForm;$('cancelAgendaEditBtn').onclick=resetAgendaForm;$('agendaItemPreset').onchange=syncAgendaPreset;$('clearAgendaBtn').onclick=clearAgenda;$('loadNextAgendaBtn').onclick=loadNextAgenda;$('nextAgendaBtn').onclick=loadNextAgenda;
    $('loadAvonTemplateBtn').onclick=function(){loadAvonTemplate(false)};$('settingsAvonTemplateBtn').onclick=function(){closeSettings();loadAvonTemplate(true)};$('saveTemplateBtn').onclick=saveTemplate;$('loadTemplateBtn').onclick=loadTemplate;$('deleteTemplateBtn').onclick=deleteTemplate;$('confirmSavePresetBtn').onclick=saveCustomPreset;
    $('competitionMode').onchange=changeCompetition;$('competitionType').onchange=changeCompetitionType;$('competitionLightsBtn').onclick=openCompetitionLights;
    $('sampleBtn').onclick=generateSampleMeeting;$('demoBtn').onclick=generateSampleMeeting;$('printBtn').onclick=printReport;$('backupBtn').onclick=backupEverything;$('settingsBackupBtn').onclick=function(){closeSettings();backupEverything()};
    $('restoreBtn').onclick=function(){$('restoreFile').click()};$('settingsRestoreBtn').onclick=function(){closeSettings();$('restoreFile').click()};$('restoreFile').onchange=function(){restoreBackupFile(this.files&&this.files[0])};
    $('checkTransferBtn').onclick=checkTransferConnection;$('createTransferBtn').onclick=createTransferCode;$('copyTransferCodeBtn').onclick=copyTransferCode;$('loadTransferBtn').onclick=loadTransferCode;$('transferCodeInput').oninput=function(){var formatted=formatTransferCode(this.value);if(this.value!==formatted)this.value=formatted;transferStatus('')};
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

  loadV9Data();createLightsExit();bindV9();resetAgendaForm();applyCompetitionMode(false);render();checkRecovery();updateTimingSummary();updateTimer()
})();
