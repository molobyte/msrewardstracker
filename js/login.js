const SUPABASE_URL = "https://soxvussrbmgqibxqkwvi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHZ1c3NyYm1ncWlieHFrd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NjU1NTksImV4cCI6MjA3NTU0MTU1OX0.wxXtaXSrVxxbkXbCZf_y3DSw6dsixhZQg3kxpLf3BFA";

const { createClient } = supabase;
const client = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função para detectar Enter e executar login
function handleEnterKey(event) {
    if (event.key === 'Enter' || event.keyCode === 13) {
        event.preventDefault();
        entrar();
    }
}

async function cadastrar() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    
    if (!email || !senha) {
    mostrarMensagem("Por favor, preencha todos os campos.", "error");
    return;
    }
    
    const { data, error } = await client.auth.signUp({ email, password: senha });
    
    if (error) {
    mostrarMensagem("Erro: " + error.message, "error");
    } else {
    mostrarMensagem("Cadastro realizado! Verifique seu e-mail.", "success");
    }
}

async function entrar() {
    const email = document.getElementById("email").value;
    const senha = document.getElementById("senha").value;
    
    if (!email || !senha) {
    mostrarMensagem("Por favor, preencha todos os campos.", "error");
    return;
    }
    
    const { data, error } = await client.auth.signInWithPassword({ email, password: senha });
    
    if (error) {
    mostrarMensagem("Erro: " + error.message, "error");
    } else {
    mostrarMensagem("Login realizado com sucesso!", "success");
    console.log("Sessão:", data.session);
    
    // Redirecionar para index.html após 1.5 segundos
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1500);
    }
}

async function sair() {
    await client.auth.signOut();
    mostrarMensagem("Você saiu da conta.", "info");
}

function mostrarMensagem(texto, tipo) {
    const mensagemEl = document.getElementById("mensagem");
    mensagemEl.innerText = texto;
    mensagemEl.className = "message " + tipo;
    
    // Esconder mensagem após 5 segundos
    setTimeout(() => {
    mensagemEl.className = "message";
    }, 5000);
}