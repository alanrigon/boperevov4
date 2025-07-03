alert('app.js carregado!');

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, Timestamp, query, where, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const ADMINS = ['alanrigon845@gmail.com'];

function renderLogin() {
  document.body.innerHTML = `
    <div class="login-form">
      <h2>Login - BOPE</h2>
      <input id="email" type="email" placeholder="Email">
      <input id="senha" type="password" placeholder="Senha">
      <button onclick="login()">Entrar</button>
      <button onclick="registrar()">Criar Conta</button>
      <div id="status"></div>
    </div>
  `;
}

window.login = async function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
    if (!userDoc.exists()) {
      alert('Usuário não encontrado no sistema.');
      return;
    }
    const userData = userDoc.data();
    if (userData.status !== 'aprovado') {
      alert('Seu cadastro ainda não foi aprovado pelo admin.');
      await auth.signOut();
      return;
    }
    alert('Login realizado com sucesso!');
    showMainHome();
  } catch (err) {
    document.getElementById("status").innerText = err.message;
  }
};

window.registrar = async function () {
  const email = document.getElementById("email").value;
  const senha = document.getElementById("senha").value;
  const name = document.getElementById("name").value;
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      nome: name,
      email: email,
      status: 'pendente',
      tipo: 'comum',
      criadoEm: new Date()
    });
    alert('Cadastro realizado! Aguarde aprovação do admin.');
  } catch (err) {
    document.getElementById("status").innerText = err.message;
  }
};

window.reset = async function () {
  const email = document.getElementById("email").value;
  try {
    await sendPasswordResetEmail(auth, email);
    alert('E-mail de recuperação enviado!');
  } catch (err) {
    document.getElementById("status").innerText = err.message;
  }
};

function renderApp(user) {
  document.body.innerHTML = `
    <h1>Controle de Sequestro - BOPE</h1>
    <form id="form">
      <input id="qra" placeholder="QRA" required>
      <input id="id" placeholder="ID" required>
      <textarea id="acao" placeholder="AÇÃO" required></textarea>
      <input id="datahora" type="datetime-local" required>
      <button type="submit">Registrar</button>
    </form>

    <div>
      <label>Filtrar por Data:</label>
      <input id="filtroDataInicio" type="date"> até <input id="filtroDataFim" type="date">
      <button onclick="filtrar()">Aplicar Filtro</button>
      <button onclick="exportarCSV()">Exportar CSV</button>
    </div>
    <table id="tabela" class="display"><thead><tr><th>QRA</th><th>ID</th><th>Ação</th><th>Data</th></tr></thead><tbody></tbody></table>
  `;

  document.getElementById("form").onsubmit = async function (e) {
    e.preventDefault();
    const data = {
      qra: form.qra.value,
      id: form.id.value,
      acao: form.acao.value,
      datahora: Timestamp.fromDate(new Date(form.datahora.value))
    };
    await addDoc(collection(db, "acoes"), data);
    alert("Registrado!");
    form.reset();
  };

  carregarRegistros();
}

async function carregarRegistros(filtro = null) {
  const tabela = document.querySelector("#tabela tbody");
  tabela.innerHTML = "";
  let registros = [];
  const ref = collection(db, "acoes");
  let q = ref;

  if (filtro) {
    q = query(ref, where("datahora", ">=", filtro.inicio), where("datahora", "<=", filtro.fim));
  }

  const snap = await getDocs(q);
  snap.forEach(doc => {
    const d = doc.data();
    const data = d.datahora.toDate().toLocaleString("pt-BR");
    tabela.innerHTML += `<tr><td>${d.qra}</td><td>${d.id}</td><td>${d.acao}</td><td>${data}</td></tr>`;
    registros.push(d);
  });

  if (!$.fn.DataTable.isDataTable('#tabela')) {
    $('#tabela').DataTable();
  }
}

window.filtrar = () => {
  const inicio = new Date(document.getElementById("filtroDataInicio").value);
  const fim = new Date(document.getElementById("filtroDataFim").value);
  if (!isNaN(inicio) && !isNaN(fim)) {
    carregarRegistros({ inicio: Timestamp.fromDate(inicio), fim: Timestamp.fromDate(fim) });
  }
};

window.exportarCSV = async () => {
  const ref = collection(db, "acoes");
  const snap = await getDocs(ref);
  const dados = [];
  snap.forEach(doc => {
    const d = doc.data();
    dados.push({
      QRA: d.qra,
      ID: d.id,
      Ação: d.acao,
      DataHora: d.datahora.toDate().toLocaleString("pt-BR")
    });
  });
  const csv = Papa.unparse(dados);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "registros.csv";
  link.click();
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    showAdminPanelIfAdmin();
  } else {
    document.getElementById('admin-approval-panel').style.display = 'none';
  }
});

// Exibir painel admin apenas para admins
async function showAdminPanelIfAdmin() {
  const user = auth.currentUser;
  if (!user) {
    document.getElementById('admin-approval-panel').style.display = 'none';
    return;
  }
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists() && userDoc.data().tipo === 'admin') {
    document.getElementById('admin-approval-panel').style.display = 'block';
    loadPendingUsers();
  } else {
    document.getElementById('admin-approval-panel').style.display = 'none';
  }
}

async function loadPendingUsers() {
  const usersCol = collection(db, 'users');
  const snapshot = await getDocs(usersCol);
  const tbody = document.querySelector('#pending-users-table tbody');
  tbody.innerHTML = '';
  snapshot.forEach(docSnap => {
    const user = docSnap.data();
    if (user.status === 'pendente') {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${user.nome || ''}</td>
        <td>${user.email}</td>
        <td>${user.criadoEm ? new Date(user.criadoEm.seconds ? user.criadoEm.seconds * 1000 : user.criadoEm).toLocaleString() : ''}</td>
        <td>
          <button class="approve-btn" data-id="${docSnap.id}">Aprovar</button>
          <button class="reject-btn" data-id="${docSnap.id}">Rejeitar</button>
        </td>
      `;
      tbody.appendChild(tr);
    }
  });
  // Adiciona eventos aos botões
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, 'users', btn.dataset.id), { status: 'aprovado' });
      loadPendingUsers();
    };
  });
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, 'users', btn.dataset.id), { status: 'rejeitado' });
      loadPendingUsers();
    };
  });
  document.querySelectorAll('.make-admin-btn').forEach(btn => {
    btn.onclick = async () => {
      await updateDoc(doc(db, 'users', btn.dataset.id), { tipo: 'admin', status: 'aprovado' });
      loadPendingUsers();
    };
  });
}

loadPendingUsers();

function showMainHome() {
  document.getElementById('auth-container').style.display = 'none';
  document.getElementById('admin-approval-panel').style.display = 'none';
  document.getElementById('main-home').style.display = 'flex';
  showPainelNav();
}

// Navegação dos botões da tela inicial
setTimeout(() => {
  const btnSeq = document.getElementById('btn-cadastrar-sequestros');
  const btnAcoes = document.getElementById('btn-cadastrar-acoes');
  if (btnSeq) btnSeq.onclick = () => {
    document.getElementById('main-home').style.display = 'none';
    document.getElementById('form-sequestro').style.display = 'flex';
  };
  if (btnAcoes) btnAcoes.onclick = () => {
    document.getElementById('main-home').style.display = 'none';
    document.getElementById('form-acao').style.display = 'flex';
  };
  // Botões de voltar
  const btnVoltarSeq = document.getElementById('btn-voltar-sequestro');
  if (btnVoltarSeq) btnVoltarSeq.onclick = () => {
    document.getElementById('form-sequestro').style.display = 'none';
    document.getElementById('main-home').style.display = 'flex';
  };
  const btnVoltarAco = document.getElementById('btn-voltar-acao');
  if (btnVoltarAco) btnVoltarAco.onclick = () => {
    document.getElementById('form-acao').style.display = 'none';
    document.getElementById('main-home').style.display = 'flex';
  };
  // Salvar Sequestro
  const btnSalvarSeq = document.getElementById('btn-salvar-sequestro');
  if (btnSalvarSeq) btnSalvarSeq.onclick = async () => {
    const vitima = document.getElementById('seq-vitimado').value;
    const local = document.getElementById('seq-local').value;
    const data = document.getElementById('seq-data').value;
    const detalhes = document.getElementById('seq-detalhes').value;
    try {
      await addDoc(collection(db, 'sequestros'), {
        vitima, local, data, detalhes,
        criadoPor: auth.currentUser ? auth.currentUser.uid : null,
        criadoEm: new Date()
      });
      alert('Sequestro cadastrado com sucesso!');
      document.getElementById('form-sequestro').style.display = 'none';
      document.getElementById('main-home').style.display = 'flex';
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
  };
  // Salvar Ação
  const btnSalvarAco = document.getElementById('btn-salvar-acao');
  if (btnSalvarAco) btnSalvarAco.onclick = async () => {
    const titulo = document.getElementById('acao-titulo').value;
    const responsavel = document.getElementById('acao-responsavel').value;
    const data = document.getElementById('acao-data').value;
    const detalhes = document.getElementById('acao-detalhes').value;
    try {
      await addDoc(collection(db, 'acoes'), {
        titulo, responsavel, data, detalhes,
        criadoPor: auth.currentUser ? auth.currentUser.uid : null,
        criadoEm: new Date()
      });
      alert('Ação cadastrada com sucesso!');
      document.getElementById('form-acao').style.display = 'none';
      document.getElementById('main-home').style.display = 'flex';
    } catch (e) {
      alert('Erro ao salvar: ' + e.message);
    }
  };
}, 500);

// Exibir botão e painel gestor apenas para gestor/admin
async function showPainelNav() {
  document.getElementById('painel-nav').style.display = 'flex';
  showPainelGeral();
  // Verifica permissão
  const user = auth.currentUser;
  if (!user) return;
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists() && (userDoc.data().tipo === 'gestor' || userDoc.data().tipo === 'admin')) {
    document.getElementById('btn-painel-gestor').style.display = 'inline-block';
  } else {
    document.getElementById('btn-painel-gestor').style.display = 'none';
  }
}

function showPainelGeral() {
  document.getElementById('painel-geral').style.display = 'block';
  document.getElementById('painel-usuarios').style.display = 'none';
  atualizarGraficoGeral();
  atualizarGraficoSequestros();
  atualizarGraficoAcoes();
  carregarResultadosUsuarios();
}

function showPainelUsuarios() {
  document.getElementById('painel-geral').style.display = 'none';
  document.getElementById('painel-usuarios').style.display = 'block';
  carregarResultadosUsuarios();
}

// Painel Gestor
async function showPainelGestor() {
  document.getElementById('painel-geral').style.display = 'none';
  document.getElementById('painel-usuarios').style.display = 'none';
  document.getElementById('painel-gestor').style.display = 'block';
  await carregarPainelGestor();
  // Simulação de envio automático
  if (localStorage.getItem('relatorioAgendado') === 'true') {
    const now = new Date();
    if (now.getDate() <= 3 && !localStorage.getItem('relatorioEnviado_'+now.getMonth()+now.getFullYear())) {
      alert('Relatório mensal enviado automaticamente! (Simulação)');
      localStorage.setItem('relatorioEnviado_'+now.getMonth()+now.getFullYear(), 'true');
    }
  }
}

async function carregarPainelGestor() {
  // Preencher filtros
  const usersSnap = await getDocs(collection(db, 'users'));
  const sequestrosSnap = await getDocs(collection(db, 'sequestros'));
  const acoesSnap = await getDocs(collection(db, 'acoes'));
  // Usuários
  const filtroUsuario = document.getElementById('filtro-gestor-usuario');
  filtroUsuario.innerHTML = '<option value="todos">Todos</option>' + Array.from(usersSnap.docs).filter(u=>u.data().status==='aprovado').map(u=>`<option value="${u.id}">${u.data().nome || u.data().email}</option>`).join('');
  // Meses
  const datas = [...sequestrosSnap.docs, ...acoesSnap.docs].map(doc => new Date(doc.data().data || doc.data().criadoEm));
  const meses = Array.from(new Set(datas.map(d => d && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : null).filter(Boolean))).sort().reverse();
  const filtroMes = document.getElementById('filtro-gestor-mes');
  filtroMes.innerHTML = '<option value="todos">Todos</option>' + meses.map(m => `<option value="${m}">${m.split('-')[1]}/${m.split('-')[0]}</option>`).join('');
  // Tipo
  const filtroTipo = document.getElementById('filtro-gestor-tipo');
  // Filtros selecionados
  const usuarioSel = filtroUsuario.value || 'todos';
  const periodoSel = filtroMes.value || 'todos';
  const tipoSel = filtroTipo.value || 'todos';
  // Filtrar registros
  let registros = [];
  sequestrosSnap.forEach(doc => {
    const d = new Date(doc.data().data || doc.data().criadoEm);
    const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if ((usuarioSel==='todos'||doc.data().criadoPor===usuarioSel) && (periodoSel==='todos'||mes===periodoSel) && (tipoSel==='todos'||tipoSel==='sequestro')) {
      registros.push({ tipo:'Sequestro', ...doc.data(), dataFormatada: d.toLocaleDateString() });
    }
  });
  acoesSnap.forEach(doc => {
    const d = new Date(doc.data().data || doc.data().criadoEm);
    const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if ((usuarioSel==='todos'||doc.data().criadoPor===usuarioSel) && (periodoSel==='todos'||mes===periodoSel) && (tipoSel==='todos'||tipoSel==='acao')) {
      registros.push({ tipo:'Ação Marcada', ...doc.data(), dataFormatada: d.toLocaleDateString() });
    }
  });
  // Mostrar totais
  document.getElementById('gestor-resultados').innerHTML = `Total: <b>${registros.length}</b> | Sequestros: <b>${registros.filter(r=>r.tipo==='Sequestro').length}</b> | Ações Marcadas: <b>${registros.filter(r=>r.tipo==='Ação Marcada').length}</b>`;
  // Gráfico
  const dados = {};
  registros.forEach(r => {
    dados[r.dataFormatada] = (dados[r.dataFormatada]||0)+1;
  });
  const labels = Object.keys(dados).sort((a,b)=>new Date(a)-new Date(b));
  const valores = labels.map(l=>dados[l]);
  setTimeout(() => {
    if (window.graficoGestor) window.graficoGestor.destroy();
    const ctx = document.getElementById('grafico-gestor').getContext('2d');
    window.graficoGestor = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Registros por Dia', data: valores, backgroundColor: '#2563eb' }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }, 500);
  // Atualizar ao mudar filtros
  filtroUsuario.onchange = filtroMes.onchange = filtroTipo.onchange = carregarPainelGestor;
  // Exportação CSV
  const btnRelatorio = document.getElementById('btn-gestor-relatorio');
  btnRelatorio.onclick = () => {
    let csv = 'Tipo,Data,Responsável,Detalhes\n';
    registros.forEach(r => {
      csv += `${r.tipo},${r.dataFormatada},${r.responsavel||''},${(r.vitima||r.titulo||'')}: ${(r.local||'')}${r.detalhes?(' - '+r.detalhes):''}\n`;
    });
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'relatorio-gestor.csv';
    a.click();
  };
}

// Adicionar botão de agendamento no painel gestor
setTimeout(() => {
  const painelGestor = document.getElementById('painel-gestor');
  if (!painelGestor) return;
  let btnAgendar = document.getElementById('btn-agendar-relatorio');
  if (!btnAgendar) {
    btnAgendar = document.createElement('button');
    btnAgendar.id = 'btn-agendar-relatorio';
    btnAgendar.className = 'painel-btn painel-btn-export';
    btnAgendar.innerText = 'Agendar Relatório Mensal';
    painelGestor.querySelector('.painel-filtros').appendChild(btnAgendar);
  }
  btnAgendar.onclick = () => {
    localStorage.setItem('relatorioAgendado', 'true');
    alert('Relatório mensal agendado! (Simulação: será enviado todo início de mês ao acessar o painel)');
  };
}, 1500);

// Alternar painéis
setTimeout(() => {
  const btnGeral = document.getElementById('btn-painel-geral');
  const btnUsuarios = document.getElementById('btn-painel-usuarios');
  const btnGestor = document.getElementById('btn-painel-gestor');
  if (btnGeral) btnGeral.onclick = showPainelGeral;
  if (btnUsuarios) btnUsuarios.onclick = showPainelUsuarios;
  if (btnGestor) btnGestor.onclick = showPainelGestor;
}, 500);

// Exportação CSV
setTimeout(() => {
  const btnCSV = document.getElementById('btn-exportar-csv');
  if (btnCSV) btnCSV.onclick = () => {
    const rows = Array.from(document.querySelectorAll('#tabela-usuarios tr')).map(tr => Array.from(tr.children).map(td => td.innerText));
    const csv = rows.map(r => r.map(v => '"'+v.replace(/"/g,'""')+'"').join(',')).join('\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'resultados-usuarios.csv';
    a.click();
  };
  // Exportação PDF (usando jsPDF)
  const btnPDF = document.getElementById('btn-exportar-pdf');
  if (btnPDF) btnPDF.onclick = async () => {
    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script);
      await new Promise(res => script.onload = res);
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text('Resultados por Usuário', 10, 10);
    let y = 20;
    Array.from(document.querySelectorAll('#tabela-usuarios tr')).forEach(tr => {
      doc.text(Array.from(tr.children).map(td => td.innerText).join(' | '), 10, y);
      y += 8;
    });
    doc.save('resultados-usuarios.pdf');
  };
}, 1500);

// Exibir botão 'Definir Metas' apenas para admin/gestor
setTimeout(async () => {
  const btnMetas = document.getElementById('btn-definir-metas');
  if (!btnMetas) return;
  const user = auth.currentUser;
  if (!user) return;
  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists() && (userDoc.data().tipo === 'gestor' || userDoc.data().tipo === 'admin')) {
    btnMetas.style.display = 'inline-block';
  } else {
    btnMetas.style.display = 'none';
  }
}, 1000);

// Abrir modal de metas
setTimeout(() => {
  const btnMetas = document.getElementById('btn-definir-metas');
  const modal = document.getElementById('modal-metas');
  const btnFechar = document.getElementById('btn-fechar-metas');
  if (btnMetas) btnMetas.onclick = async () => {
    modal.style.display = 'flex';
    // Preencher lista de usuários
    const usersSnap = await getDocs(collection(db, 'users'));
    const form = document.getElementById('metas-lista');
    form.innerHTML = '';
    usersSnap.forEach(userDoc => {
      const user = userDoc.data();
      if (user.status !== 'aprovado') return;
      const uid = userDoc.id;
      form.innerHTML += `<label>${user.nome || user.email}: <input type='number' min='1' value='${user.meta||10}' data-uid='${uid}' /></label>`;
    });
  };
  if (btnFechar) btnFechar.onclick = () => { modal.style.display = 'none'; };
}, 1000);

// Salvar metas personalizadas
setTimeout(() => {
  const btnSalvar = document.getElementById('btn-salvar-metas');
  const modal = document.getElementById('modal-metas');
  if (btnSalvar) btnSalvar.onclick = async () => {
    const inputs = document.querySelectorAll('#metas-lista input[type="number"]');
    for (const input of inputs) {
      const uid = input.getAttribute('data-uid');
      const meta = parseInt(input.value) || 10;
      await updateDoc(doc(db, 'users', uid), { meta });
    }
    alert('Metas salvas!');
    modal.style.display = 'none';
    carregarResultadosUsuarios();
  };
}, 1500);

// Usar meta personalizada na barra de progresso
async function carregarResultadosUsuarios() {
  const usersSnap = await getDocs(collection(db, 'users'));
  const sequestrosSnap = await getDocs(collection(db, 'sequestros'));
  const acoesSnap = await getDocs(collection(db, 'acoes'));
  const tbody = document.querySelector('#tabela-usuarios tbody');
  tbody.innerHTML = '';
  // Gerar opções de mês/ano
  const filtroMes = document.getElementById('filtro-mes');
  const datas = [...sequestrosSnap.docs, ...acoesSnap.docs].map(doc => new Date(doc.data().data || doc.data().criadoEm));
  const meses = Array.from(new Set(datas.map(d => d && !isNaN(d) ? `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` : null).filter(Boolean))).sort().reverse();
  filtroMes.innerHTML = '<option value="todos">Todos</option>' + meses.map(m => `<option value="${m}">${m.split('-')[1]}/${m.split('-')[0]}</option>`).join('');
  // Filtro selecionado
  const periodo = filtroMes.value || 'todos';
  // Contagem por usuário
  let ranking = [];
  usersSnap.forEach(userDoc => {
    const user = userDoc.data();
    if (user.status !== 'aprovado') return;
    const uid = userDoc.id;
    let totalSeq = 0, totalAco = 0;
    sequestrosSnap.forEach(doc => {
      const d = new Date(doc.data().data || doc.data().criadoEm);
      const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (periodo === 'todos' || mes === periodo) {
        if (doc.data().criadoPor === uid) totalSeq++;
      }
    });
    acoesSnap.forEach(doc => {
      const d = new Date(doc.data().data || doc.data().criadoEm);
      const mes = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (periodo === 'todos' || mes === periodo) {
        if (doc.data().criadoPor === uid) totalAco++;
      }
    });
    const total = totalSeq + totalAco;
    const meta = user.meta || 10;
    ranking.push({ nome: user.nome || '', email: user.email, totalSeq, totalAco, total, meta });
  });
  // Ordenar ranking
  ranking.sort((a,b) => b.total - a.total);
  // Preencher tabela
  ranking.forEach((user, i) => {
    const progresso = Math.min(100, Math.round((user.total / user.meta) * 100));
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i === 0 && user.total > 0 ? '🥇' : i === 1 && user.total > 0 ? '🥈' : i === 2 && user.total > 0 ? '🥉' : ''}</td>
      <td>${user.nome}</td>
      <td>${user.email}</td>
      <td>${user.totalSeq}</td>
      <td>${user.totalAco}</td>
      <td>${user.meta}</td>
      <td>
        <div class='progresso-bar'><div class='progresso-bar-inner' style='width:${progresso}%;background:${progresso>=100?'#22c55e':'#2563eb'}'></div></div>
        <div class='progresso-bar-label'>${user.total}/${user.meta} (${progresso}%)</div>
      </td>
    `;
    tbody.appendChild(tr);
  });
  // Atualizar gráfico individual
  atualizarGraficoIndividual(ranking);
}

// Gráficos extras: sequestros e ações por dia
async function atualizarGraficoSequestros() {
  const sequestrosSnap = await getDocs(collection(db, 'sequestros'));
  const dados = {};
  sequestrosSnap.forEach(doc => {
    const d = new Date(doc.data().data || doc.data().criadoEm);
    const dia = d.toLocaleDateString();
    dados[dia] = (dados[dia] || 0) + 1;
  });
  const labels = Object.keys(dados).sort((a,b) => new Date(a)-new Date(b));
  const valores = labels.map(l => dados[l]);
  setTimeout(() => {
    if (window.graficoSequestros) window.graficoSequestros.destroy();
    const ctx = document.getElementById('grafico-sequestros').getContext('2d');
    window.graficoSequestros = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Sequestros por Dia', data: valores, backgroundColor: '#f59e42' }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }, 500);
}
async function atualizarGraficoAcoes() {
  const acoesSnap = await getDocs(collection(db, 'acoes'));
  const dados = {};
  acoesSnap.forEach(doc => {
    const d = new Date(doc.data().data || doc.data().criadoEm);
    const dia = d.toLocaleDateString();
    dados[dia] = (dados[dia] || 0) + 1;
  });
  const labels = Object.keys(dados).sort((a,b) => new Date(a)-new Date(b));
  const valores = labels.map(l => dados[l]);
  setTimeout(() => {
    if (window.graficoAcoes) window.graficoAcoes.destroy();
    const ctx = document.getElementById('grafico-acoes').getContext('2d');
    window.graficoAcoes = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Ações Marcadas por Dia', data: valores, backgroundColor: '#ef4444' }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }, 500);
}

// Gráfico geral de ações por dia
async function atualizarGraficoGeral() {
  const sequestrosSnap = await getDocs(collection(db, 'sequestros'));
  const acoesSnap = await getDocs(collection(db, 'acoes'));
  const dados = {};
  sequestrosSnap.forEach(doc => {
    const d = new Date(doc.data().data || doc.data().criadoEm);
    const dia = d.toLocaleDateString();
    dados[dia] = (dados[dia] || 0) + 1;
  });
  acoesSnap.forEach(doc => {
    const d = new Date(doc.data().data || doc.data().criadoEm);
    const dia = d.toLocaleDateString();
    dados[dia] = (dados[dia] || 0) + 1;
  });
  const labels = Object.keys(dados).sort((a,b) => new Date(a)-new Date(b));
  const valores = labels.map(l => dados[l]);
  // Chart.js
  setTimeout(() => {
    if (window.graficoGeral) window.graficoGeral.destroy();
    const ctx = document.getElementById('grafico-geral').getContext('2d');
    window.graficoGeral = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Ações por Dia', data: valores, backgroundColor: '#2563eb' }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }, 500);
}
// Gráfico individual por usuário
function atualizarGraficoIndividual(ranking) {
  const labels = ranking.map(u => u.nome);
  const valores = ranking.map(u => u.total);
  setTimeout(() => {
    if (window.graficoIndividual) window.graficoIndividual.destroy();
    const ctx = document.getElementById('grafico-individual').getContext('2d');
    window.graficoIndividual = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Total por Usuário', data: valores, backgroundColor: '#22c55e' }] },
      options: { responsive: true, plugins: { legend: { display: false } } }
    });
  }, 500);
}

// Adicionar Chart.js via CDN se não existir
if (!window.Chart) {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
  document.head.appendChild(script);
}
