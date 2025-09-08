(function(){
  const HIST_KEY='osi-hist-v1', CURR_KEY='osi-current-id';
  const $=id=>document.getElementById(id);
  const ls=(k)=>JSON.parse(localStorage.getItem(k)||'null')||[];

  function render(){
    const tb=$('tb'); tb.innerHTML='';
    (ls(HIST_KEY)||[]).forEach(it=>{
      const tr=document.createElement('tr'); tr.innerHTML=`
        <td>${it.id}</td><td>${it.fecha||''}</td><td>${it.prioridad||''}</td>
        <td>${it.encargado||''}</td><td>${it.supervisor||''}</td>
        <td>${it.personal||0}</td><td>${it.estado||''}</td>
        <td><button class="badge open" data-id="${it.id}">Abrir</button></td>`;
      tb.appendChild(tr);
    });
  }
  document.addEventListener('click',e=>{
    if(e.target.classList.contains('open')){
      const id=e.target.dataset.id; localStorage.setItem(CURR_KEY,id); location.href='index.html';
    }
  });
  render();
})();
