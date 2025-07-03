# Painel de Resultados e Premiações

Este é um painel web moderno para controle de sequestros e ações marcadas, com autenticação, permissões, dashboards, metas e exportação de dados.

## 🚀 Funcionalidades
- Login, registro e recuperação de senha (Firebase Auth)
- Aprovação de usuários pelo admin
- Promoção de usuários a admin/gestor
- Cadastro de sequestros e ações marcadas
- Painéis de resultados gerais e individuais
- Ranking, metas personalizadas e barra de progresso
- Gráficos dinâmicos (Chart.js)
- Exportação CSV/PDF
- Dashboard exclusivo para gestores
- Relatórios automáticos (simulação)

## 📁 Estrutura de arquivos
```
index.html
style.css
app.js
firebase-config.js
README.md
```

## 🔧 Configuração do Firebase
1. Crie um projeto em [Firebase Console](https://console.firebase.google.com/).
2. Ative Authentication (método E-mail/Senha).
3. Ative Firestore Database.
4. Copie as credenciais do seu projeto e cole em `firebase-config.js`:
```js
export const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_DOMINIO.firebaseapp.com",
  projectId: "SEU_PROJECT_ID",
  storageBucket: "SEU_BUCKET.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
};
```

## 🌐 Como publicar online
### **GitHub Pages**
1. Envie todos os arquivos para um repositório no GitHub.
2. Vá em Settings > Pages > Branch: `main` e pasta `/` (root).
3. Acesse o link gerado pelo GitHub Pages.

### **Netlify**
1. Acesse [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Arraste a pasta do projeto ou o `.zip`.
3. Pronto! O site estará online.

### **Vercel**
1. Acesse [https://vercel.com/import/project](https://vercel.com/import/project)
2. Importe o projeto manualmente e envie os arquivos.
3. Pronto! O site estará online.

## 👤 Permissões
- **admin**: Aprova usuários, define metas, vê todos os painéis.
- **gestor**: Vê painel gestor, define metas.
- **usuário comum**: Apenas cadastro e visualização dos próprios resultados.

## 📊 Metas e Relatórios
- Metas mensais podem ser personalizadas para cada usuário (admin/gestor).
- Relatórios podem ser exportados em CSV/PDF.
- Relatórios automáticos mensais (simulação).

## 🛠️ Tecnologias
- HTML, CSS, JavaScript (ES6)
- Firebase Auth & Firestore
- Chart.js
- jsPDF (para PDF)

## 💡 Dicas
- Para alterar a imagem da tela inicial, edite o `src` da tag `<img>` em `index.html`.
- Para mudar a meta padrão, edite o valor em `firebase-config.js` ou use o painel de metas.

---

Desenvolvido com ❤️ por [Seu Nome]. 