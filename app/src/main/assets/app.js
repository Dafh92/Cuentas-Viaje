(function(){
  // ---------- datos (guardados en este teléfono) ----------
  var KEY = "cuentas-viaje-apk-v1";
  var DEF = {trip:"Viaje", names:["David","Fernanda"], su:0, items:[]};
  var state;
  try { state = JSON.parse(localStorage.getItem(KEY)) || DEF; } catch(e){ state = DEF; }
  if (!state.items) state.items = [];
  function save(){ try { localStorage.setItem(KEY, JSON.stringify(state)); return true; } catch(e){ return false; } }

  var now = function(){ return Date.now(); };
  var fmt = function(n){ return "$" + Math.round(n).toLocaleString("es-CL"); };
  var parseMoney = function(s){ var d = String(s).replace(/[^\d]/g,""); return d ? parseInt(d,10) : 0; };
  var esc = function(s){ return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];}); };
  var N = function(i){ return state.names[i] || ("Persona " + (i+1)); };
  var live = function(){ return state.items.filter(function(x){ return !x.deleted; }); };

  function share(it){ return it.split === "full" ? it.amount : it.amount / 2; }
  function compute(){
    var net = 0, total = 0, paid = [0,0];
    live().forEach(function(it){
      var s = share(it);
      net += it.payer === 0 ? s : -s; // >0: persona 2 le debe a persona 1
      paid[it.payer] += it.amount;
      if (it.split !== "full") total += it.amount;
    });
    return {net:net, total:total, paid:paid};
  }
  function balanceLine(){
    var r = Math.round(compute().net);
    return Math.abs(r) < 1 ? "Estamos a mano." : (N(r>0?1:0) + " le debe " + fmt(Math.abs(r)) + " a " + N(r>0?0:1));
  }

  // ---------- pantalla ----------
  var root = document.getElementById("root");
  function render(){
    var c = compute(), r = Math.round(c.net), bal;
    if (Math.abs(r) < 1) {
      bal = '<div class="lbl">Balance</div><div class="even">Están a mano 🤝</div>';
    } else {
      var debtor = r > 0 ? 1 : 0, creditor = 1 - debtor;
      bal = '<div class="lbl">Balance</div><div class="big">' + fmt(Math.abs(r)) + '</div>' +
        '<div class="who">' + esc(N(debtor)) + ' le debe a ' + esc(N(creditor)) + '</div>' +
        '<button class="settle" data-act="settle">Registrar pago de la deuda</button>';
    }
    var list = live().sort(function(a,b){ return b.t - a.t; }).map(function(it){
      var when = new Date(it.t).toLocaleDateString("es-CL",{day:"numeric",month:"short"});
      var sub = (it.split === "full")
        ? "Pagó " + esc(N(it.payer)) + " · todo de " + esc(N(1-it.payer))
        : "Pagó " + esc(N(it.payer)) + " · mitad y mitad";
      return '<button class="item p'+it.payer+'" data-edit="'+it.id+'">' +
        '<div class="dot">'+esc(N(it.payer).charAt(0).toUpperCase())+'</div>' +
        '<div class="mid"><div class="d">'+esc(it.desc || "Gasto")+'</div><div class="s">'+sub+' · '+when+'</div></div>' +
        '<div class="amt">'+fmt(it.amount)+'<small>'+(it.split==="full"?"":"c/u "+fmt(it.amount/2))+'</small></div></button>';
    }).join("");
    root.innerHTML =
      '<div class="wrap">' +
      '<header class="top"><h1>'+esc(state.trip)+'</h1>' +
      '<div><button class="iconbtn" data-act="sync" aria-label="Compartir o importar">⇄</button>' +
      '<button class="iconbtn" data-act="settings" aria-label="Ajustes">⚙︎</button></div></header>' +
      '<section class="balance">'+bal+'</section>' +
      '<div class="stats">' +
        '<div class="stat"><div class="k">Gasto total</div><div class="v">'+fmt(c.total)+'</div></div>' +
        '<div class="stat"><div class="k">Pagó '+esc(N(0))+'</div><div class="v">'+fmt(c.paid[0])+'</div></div>' +
        '<div class="stat"><div class="k">Pagó '+esc(N(1))+'</div><div class="v">'+fmt(c.paid[1])+'</div></div>' +
      '</div>' +
      '<h2>Movimientos</h2>' +
      (list ? '<div class="list">'+list+'</div>' : '<div class="empty">Aún no hay gastos.<br>Toca <b>+ Agregar gasto</b> para anotar el primero.</div>') +
      '<p class="status">Guardado en este teléfono · funciona sin señal</p>' +
      '</div>' +
      '<button class="fab" data-act="add">+ Agregar gasto</button>';
  }
  function commit(){ save(); render(); }

  // ---------- ventanas ----------
  var scrim = document.createElement("div"); scrim.className = "scrim"; document.body.appendChild(scrim);
  scrim.addEventListener("click", function(e){ if (e.target === scrim) closeSheet(); });
  function openSheet(html){ scrim.innerHTML = '<div class="sheet">'+html+'</div>'; scrim.classList.add("open"); }
  function closeSheet(){ scrim.classList.remove("open"); scrim.innerHTML = ""; }
  window.onBack = function(){ if (scrim.classList.contains("open")) { closeSheet(); return true; } return false; };

  var QUICK = ["Bencina","Almuerzo","Cena","Supermercado","Alojamiento","Peaje","Ferry","Camping","Café"];

  function expenseForm(existing, preset){
    var it = existing || preset || {desc:"", amount:0, payer:0, split:"half"};
    var draft = {desc:it.desc, amount:it.amount, payer:it.payer, split:it.split};
    openSheet(
      '<h3>'+(existing ? "Editar gasto" : (preset ? "Pago de deuda" : "Nuevo gasto"))+'</h3>' +
      '<label class="f">Monto</label>' +
      '<input class="t money" id="f-amt" inputmode="numeric" autocomplete="off" placeholder="$0" value="'+(draft.amount?fmt(draft.amount):"")+'">' +
      '<label class="f">¿En qué?</label>' +
      '<input class="t" id="f-desc" autocomplete="off" placeholder="Ej: Bencina en Coyhaique" value="'+esc(draft.desc)+'">' +
      '<div class="chips">'+QUICK.map(function(q){return '<button class="chip" data-q="'+q+'">'+q+'</button>';}).join("")+'</div>' +
      '<label class="f">¿Quién pagó?</label>' +
      '<div class="seg" id="f-payer"><button class="p0" data-v="0">'+esc(N(0))+'</button><button class="p1" data-v="1">'+esc(N(1))+'</button></div>' +
      '<label class="f">¿Cómo se reparte?</label>' +
      '<div class="seg" id="f-split"><button class="n" data-v="half">Mitad y mitad</button><button class="n" data-v="full" id="f-full"></button></div>' +
      '<div class="hint" id="f-hint"></div>' +
      '<div class="row">' +
        (existing ? '<button class="btn del" id="f-del">Eliminar</button>' : '') +
        '<button class="btn sec" id="f-cancel">Cancelar</button>' +
        '<button class="btn pri" id="f-save">Guardar</button>' +
      '</div>'
    );
    var amt = document.getElementById("f-amt"), desc = document.getElementById("f-desc");
    function refresh(){
      [].forEach.call(document.querySelectorAll("#f-payer button"), function(b){ b.classList.toggle("on", +b.dataset.v === draft.payer); });
      [].forEach.call(document.querySelectorAll("#f-split button"), function(b){ b.classList.toggle("on", b.dataset.v === draft.split); });
      document.getElementById("f-full").textContent = "Todo de " + N(1 - draft.payer);
      var h = "";
      if (draft.amount > 0) {
        h = "→ " + N(1-draft.payer) + " le debe " + fmt(draft.split === "full" ? draft.amount : draft.amount/2) + " a " + N(draft.payer);
      } else if (draft.split === "full") {
        h = "Úsalo para pagos de deuda o cosas que son solo de una persona.";
      }
      document.getElementById("f-hint").textContent = h;
      document.getElementById("f-save").disabled = !(draft.amount > 0);
    }
    amt.addEventListener("input", function(){ draft.amount = parseMoney(amt.value); amt.value = draft.amount ? fmt(draft.amount) : ""; refresh(); });
    desc.addEventListener("input", function(){ draft.desc = desc.value; });
    scrim.querySelectorAll(".chip").forEach(function(ch){ ch.addEventListener("click", function(){ desc.value = draft.desc = ch.dataset.q; }); });
    document.getElementById("f-payer").addEventListener("click", function(e){ var b = e.target.closest("button"); if(b){ draft.payer = +b.dataset.v; refresh(); } });
    document.getElementById("f-split").addEventListener("click", function(e){ var b = e.target.closest("button"); if(b){ draft.split = b.dataset.v; refresh(); } });
    document.getElementById("f-cancel").addEventListener("click", closeSheet);
    document.getElementById("f-save").addEventListener("click", function(){
      if (!(draft.amount > 0)) return;
      var rec = {desc:(draft.desc||"").trim().slice(0,80), amount:draft.amount, payer:draft.payer, split:draft.split, u:now()};
      if (existing) Object.assign(existing, rec);
      else { rec.id = now().toString(36) + Math.random().toString(36).slice(2,6); rec.t = now(); state.items.push(rec); }
      closeSheet(); commit();
    });
    var del = document.getElementById("f-del");
    if (del) {
      var armed = false;
      del.addEventListener("click", function(){
        if (!armed) { armed = true; del.textContent = "¿Seguro?"; return; }
        existing.deleted = true; existing.u = now();   // se marca, para que el borrado también se comparta
        closeSheet(); commit();
      });
    }
    refresh();
    if (!existing && !preset) setTimeout(function(){ amt.focus(); }, 80);
  }

  function settingsForm(){
    openSheet(
      '<h3>Ajustes</h3>' +
      '<label class="f">Nombre del viaje</label><input class="t" id="s-trip" value="'+esc(state.trip)+'">' +
      '<label class="f">Persona 1</label><input class="t" id="s-n0" value="'+esc(N(0))+'">' +
      '<label class="f">Persona 2</label><input class="t" id="s-n1" value="'+esc(N(1))+'">' +
      '<label class="f">Empezar de cero</label>' +
      '<button class="btn sec bigbtn" id="s-reset" style="color:var(--danger)">Borrar todos los gastos</button>' +
      '<div class="row"><button class="btn sec" id="s-cancel">Cancelar</button><button class="btn pri" id="s-save">Guardar</button></div>'
    );
    document.getElementById("s-cancel").addEventListener("click", closeSheet);
    document.getElementById("s-save").addEventListener("click", function(){
      state.trip = document.getElementById("s-trip").value.trim().slice(0,50) || "Viaje";
      state.names = [document.getElementById("s-n0").value.trim().slice(0,20) || "Persona 1",
                     document.getElementById("s-n1").value.trim().slice(0,20) || "Persona 2"];
      state.su = now();
      closeSheet(); commit();
    });
    var armed = false, rb = document.getElementById("s-reset");
    rb.addEventListener("click", function(){
      if (!armed) { armed = true; rb.textContent = "Toca otra vez para borrar todo"; return; }
      var t = now(); state.items.forEach(function(x){ if (!x.deleted){ x.deleted = true; x.u = t; } });
      closeSheet(); commit();
    });
  }

  // ---------- compartir / importar ----------
  var b64e = function(s){ return btoa(unescape(encodeURIComponent(s))); };
  var b64d = function(s){ return decodeURIComponent(escape(atob(s))); };

  function exportText(){
    var lines = [state.trip, ""];
    live().sort(function(a,b){return a.t-b.t;}).forEach(function(it){
      lines.push("• " + (it.desc||"Gasto") + ": " + fmt(it.amount) + " (pagó " + N(it.payer) + (it.split==="full" ? ", todo de " + N(1-it.payer) : "") + ")");
    });
    lines.push("", "Gasto total: " + fmt(compute().total), balanceLine(), "",
      "Para juntar con tu app: copia este mensaje completo y pégalo en ⇄ → Importar.",
      "CUENTAS1:" + b64e(JSON.stringify({trip:state.trip, names:state.names, su:state.su||0, items:state.items})));
    return lines.join("\n");
  }

  function merge(other){
    var byId = {}, added = 0, updated = 0;
    state.items.forEach(function(x){ byId[x.id] = x; });
    (other.items || []).forEach(function(o){
      if (!o || !o.id || typeof o.amount !== "number") return;
      var mine = byId[o.id];
      if (!mine) { state.items.push(o); byId[o.id] = o; if (!o.deleted) added++; }
      else if ((o.u||0) > (mine.u||0)) { Object.assign(mine, o); updated++; }
    });
    if ((other.su||0) > (state.su||0) && other.names) { state.trip = other.trip || state.trip; state.names = other.names.slice(0,2); state.su = other.su; }
    return {added:added, updated:updated};
  }

  function syncSheet(){
    openSheet(
      '<h3>Juntar con el otro teléfono</h3>' +
      '<div class="help">Cada teléfono guarda sus propios gastos. Para que los dos queden iguales:<ol>' +
      '<li>Uno toca <b>Compartir</b> y lo manda por WhatsApp.</li>' +
      '<li>El otro copia el mensaje completo, lo pega abajo y toca <b>Importar</b>.</li>' +
      '<li>Después hagan lo mismo al revés.</li></ol>' +
      'No se duplica nada: puedes importar el mismo mensaje varias veces.</div>' +
      '<button class="btn pri bigbtn" id="x-share">Compartir mis gastos</button>' +
      '<label class="f">Pega aquí el mensaje recibido</label>' +
      '<textarea class="t" id="x-in" placeholder="Mantén presionado → Pegar"></textarea>' +
      '<div class="msg" id="x-msg"></div>' +
      '<div class="row"><button class="btn sec" id="x-close">Cerrar</button><button class="btn pri" id="x-imp">Importar</button></div>'
    );
    var msg = document.getElementById("x-msg");
    function say(t, ok){ msg.textContent = t; msg.className = "msg " + (ok ? "ok" : "err"); }
    document.getElementById("x-close").addEventListener("click", closeSheet);
    document.getElementById("x-share").addEventListener("click", function(){
      var t = exportText();
      if (window.Android && window.Android.share) { window.Android.share(t); return; }
      if (navigator.clipboard) navigator.clipboard.writeText(t).then(function(){ say("Copiado. Pégalo en WhatsApp.", true); }, function(){ say("No se pudo copiar.", false); });
    });
    document.getElementById("x-imp").addEventListener("click", function(){
      var m = /CUENTAS1:([A-Za-z0-9+/=]+)/.exec(document.getElementById("x-in").value.replace(/\s+/g,""));
      if (!m) { say("No encontré el código. Copia el mensaje completo, incluida la última línea.", false); return; }
      var data; try { data = JSON.parse(b64d(m[1])); } catch(e) { say("El código está incompleto o dañado.", false); return; }
      var r = merge(data); commit();
      say(r.added || r.updated ? ("Listo: " + r.added + " gasto(s) nuevo(s), " + r.updated + " actualizado(s). " + balanceLine()) : "Ya tenías todo eso. " + balanceLine(), true);
    });
  }

  root.addEventListener("click", function(e){
    var b = e.target.closest("[data-act],[data-edit]"); if (!b) return;
    if (b.dataset.edit) { var it = state.items.filter(function(x){return x.id === b.dataset.edit;})[0]; if (it) expenseForm(it); return; }
    var a = b.dataset.act;
    if (a === "add") expenseForm();
    else if (a === "settings") settingsForm();
    else if (a === "sync") syncSheet();
    else if (a === "settle") {
      var r = Math.round(compute().net);
      expenseForm(null, {desc:"Pago de deuda", amount:Math.abs(r), payer:r > 0 ? 1 : 0, split:"full"});
    }
  });

  render();
})();
