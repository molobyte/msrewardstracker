// ===== AUTENTICAÇÃO COM SUPABASE =====
const SUPABASE_URL = "https://soxvussrbmgqibxqkwvi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNveHZ1c3NyYm1ncWlieHFrd3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NjU1NTksImV4cCI6MjA3NTU0MTU1OX0.wxXtaXSrVxxbkXbCZf_y3DSw6dsixhZQg3kxpLf3BFA";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Verificar sessão ao carregar a página
async function checkSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        // Sem sessão ativa, redirecionar para login
        window.location.href = "login.html";
        return false;
    }
    
    console.log("Usuário autenticado:", session.user.email);
    
    // Salvar o UUID do usuário atual
    currentUserId = session.user.id;
    
    // Atualizar email do usuário no header
    const userEmailElement = document.getElementById('userEmail');
    if (userEmailElement) {
        userEmailElement.textContent = session.user.email;
    }
    
    return true;
}

// Função de logout
async function logout() {
    const confirmLogout = confirm("Deseja realmente sair?");
    if (confirmLogout) {
        // Salvar dados pendentes antes de sair
        if (hasUnsavedChanges) {
            console.log('💾 Salvando dados pendentes antes de fazer logout...');
            await saveData(true); // Salvar imediatamente
        }
        
        await supabaseClient.auth.signOut();
        window.location.href = "login.html";
    }
}

// Função para abrir/fechar dropdown do menu de usuário
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}

// Fechar dropdown ao clicar fora dele
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu-container');
    const dropdown = document.getElementById('userDropdown');
    
    if (dropdown && userMenu && !userMenu.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Verificar sessão antes de inicializar
checkSession().then(isAuthenticated => {
    if (isAuthenticated) {
        init();
    }
});

// ===== ESTRUTURA DE DADOS =====
// Estrutura de dados
const today = new Date();
let currentYear = today.getFullYear();
let currentMonth = today.getMonth(); // 0-indexed (0 = Janeiro, 11 = Dezembro)
let data = {};

// ===== CONTROLE DE SALVAMENTO COM DEBOUNCE =====
let saveTimeout = null; // Timer para debounce de 30 segundos
let hasUnsavedChanges = false; // Flag para indicar mudanças não salvas
let currentUserId = null; // UUID do usuário atual logado

// Funções auxiliares para localStorage segregado por usuário
function getLocalStorageKey(userId) {
    return `msRewardsData_${userId}`;
}

function saveToLocalStorage(userId, data) {
    const key = getLocalStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(data));
    console.log(`💾 Dados salvos no localStorage para usuário: ${userId.substring(0, 8)}...`);
}

function loadFromLocalStorage(userId) {
    const key = getLocalStorageKey(userId);
    const saved = localStorage.getItem(key);
    if (saved) {
        console.log(`📂 Dados carregados do localStorage para usuário: ${userId.substring(0, 8)}...`);
        return JSON.parse(saved);
    }
    return null;
}

// Detectar informações básicas do dispositivo/browser para exibição
function getDeviceInfo() {
    const ua = navigator.userAgent || '';
    let os = 'Desconhecido';
    let browser = 'Desconhecido';

    // IMPORTANTE: Verificar mobile PRIMEIRO (antes de Mac/Linux)
    if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
    else if (ua.indexOf('Android') !== -1) os = 'Android';
    else if (ua.indexOf('Win') !== -1) os = 'Windows';
    else if (ua.indexOf('Mac') !== -1) os = 'macOS';
    else if (ua.indexOf('Linux') !== -1) os = 'Linux';

    if (ua.indexOf('Edg') !== -1) browser = 'Edge';
    else if (ua.indexOf('Chrome') !== -1) browser = 'Chrome';
    else if (ua.indexOf('Firefox') !== -1) browser = 'Firefox';
    else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';

    return `${browser} no ${os}`;
}

const monthNames = ['Jan.', 'Fev.', 'Mar.', 'Abr.', 'Mai.', 'Jun.', 
                    'Jul.', 'Ago.', 'Set.', 'Out.', 'Nov.', 'Dez.'];

const activities = [
    { id: 'conjuntodiario', name: 'Conjunto Diario', color: '#FFFF00', defaultValue: 125 },
    { id: 'maisatividade', name: 'Mais Atividade', color: '#FFFF00', defaultValue: 300 },
    { id: 'navegaredge', name: 'Navegar com Edge', color: '#FFFF00', defaultValue: 5 },
    { id: 'pesquisabingpc', name: 'Pesquisas do Bing', color: '#FFFF00', defaultValue: 30 },
    { id: 'diariabing', name: 'Diaria do App Bing', color: '#5a8eed', defaultValue: 25 },
    { id: 'noticiasbing', name: 'Noticias do App Bing', color: '#5a8eed', defaultValue: 150 },
    { id: 'useappxbox', name: 'Use o App Xbox no Celular', color: '#00B050', defaultValue: 5 },
    { id: 'playjewels', name: 'Jogar Jewels no Celular', color: '#00B050', defaultValue: 5 },
    { id: 'playgamepass', name: 'Jogar um jogo do Gamepass', color: '#92D050', defaultValue: 20 },
    { id: 'playconsole', name: 'Jogar um jogo no Xbox', color: '#92D050', defaultValue: 20 },
    { id: 'playwindows', name: 'Jogar um jogo no PC', color: '#92D050', defaultValue: 5 }
];

// ===== CONFIGURAÇÕES DE BÔNUS =====
// Altere os valores abaixo para modificar os bônus concedidos
const BONUS_CONFIG = {
    // Quebra Cabeças Bing - 7 dias consecutivos de Pesquisas Bing PC
    quebraCabecasBing: {
        valor: 100,
        nome: 'Quebra Cabeças Bing',
        diasConsecutivos: 7,
        atividade: 'pesquisabingpc'
    },
    // Bônus de Sequência do Bing - 10 dias consecutivos de Conjunto Diário
    bonusSequenciaBing: {
        valor: 150,
        nome: 'Bonus de Sequencia do Bing',
        diasConsecutivos: 10,
        atividade: 'conjuntodiario'
    },
    // Bônus de Sequência do Edge - 7 dias consecutivos de Navegar com Edge
    bonusSequenciaEdge: {
        valor: 100,
        nome: 'Bonus de Sequencia do Edge',
        diasConsecutivos: 7,
        atividade: 'navegaredge'
    },
    // Sequências Semanais Gamepass - 7 dias consecutivos de Jogar Gamepass
    sequenciasSemanaisGamepass: {
        valor: 700,
        nome: 'Sequencias Semanais Gamepass',
        diasConsecutivos: 7,
        atividade: 'playgamepass'
    },
    // Bônus Semanal do Console - 5 dias em uma semana de Jogar Xbox
    bonusSemanalConsole: {
        valor: 260,
        nome: 'Bonus Semanal do Console',
        diasPorSemana: 5,
        atividade: 'playconsole'
    },
    // Bônus Semanal do Windows - 5 dias em uma semana de Jogar PC
    bonusSemanalWindows: {
        valor: 260,
        nome: 'Bonus Semanal do Windows',
        diasPorSemana: 5,
        atividade: 'playwindows'
    }
};

// Inicialização
async function init() {
    await loadData();
    updateMonthDisplay();
    generateTable();
    await updateLastSaveTime();
}

function updateMonthDisplay() {
    document.getElementById('currentMonth').textContent = 
        `${monthNames[currentMonth]} ${currentYear}`;
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

function getDayOfWeek(year, month, day) {
    const date = new Date(year, month, day);
    return date.getDay(); // 0 = Domingo, 6 = Sábado
}

function isWeekend(year, month, day) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
}

function generateTable() {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const monthKey = `${currentYear}-${currentMonth}`;
    
    if (!data[monthKey]) {
        data[monthKey] = {};
    }

    let html = '<table><thead><tr><th class="row-header">Dia da semana</th>';
    
    // Cabeçalho com dias
    for (let day = 1; day <= daysInMonth; day++) {
        html += `<th class="date-header">${day}</th>`;
    }
    html += '</tr></thead><tbody>';

    // CALCULAR BÔNUS ANTES DAS LINHAS DE ACUMULADO/TOTAL
    // Detectar grupos de 7 dias completados de pesquisabingpc para bônus
    // Estrutura: bonusPerDay[day] = { total: number, items: [{value: number, name: string}] }
    let bonusPerDay = {};
    
    // === BÔNUS 1: Quebra Cabeças Bing (7 dias de Pesquisas Bing PC) ===
    // Identificar todos os grupos de 7 dias consecutivos de pesquisabingpc
    let consecutiveDays = 0;
    let groupStart = 0;
    
    // Verificar se há continuação do mês anterior
    const prevMonthForBonus = currentMonth - 1;
    const prevYearForBonus = prevMonthForBonus < 0 ? currentYear - 1 : currentYear;
    const prevMonthIndexForBonus = prevMonthForBonus < 0 ? 11 : prevMonthForBonus;
    const prevMonthKeyForBonus = `${prevYearForBonus}-${prevMonthIndexForBonus}`;
    const prevMonthDaysForBonus = getDaysInMonth(prevYearForBonus, prevMonthIndexForBonus);
    
    // Contar dias consecutivos do final do mês anterior
    for (let d = prevMonthDaysForBonus; d >= 1; d--) {
        const dKey = `day${d}`;
        const dValue = data[prevMonthKeyForBonus]?.[dKey]?.pesquisabingpc;
        if (dValue && dValue !== '' && dValue !== 0) {
            consecutiveDays++;
        } else {
            break;
        }
    }
    
    // Se já havia dias consecutivos do mês anterior, ajustar
    if (consecutiveDays > 0) {
        consecutiveDays = Math.min(consecutiveDays, 6); // Máximo 6 do mês anterior
    }
    
    // Processar dias do mês atual para detectar bônus
    for (let d = 1; d <= daysInMonth; d++) {
        const dKey = `day${d}`;
        const dValue = data[monthKey][dKey]?.pesquisabingpc;
        
        if (dValue && dValue !== '' && dValue !== 0) {
            if (consecutiveDays === 0) {
                groupStart = d;
            }
            consecutiveDays++;
            
            // Se completou 7 dias, adicionar bônus no 7º dia
            if (consecutiveDays === 7) {
                if (!bonusPerDay[d]) {
                    bonusPerDay[d] = { total: 0, items: [] };
                }
                bonusPerDay[d].total += BONUS_CONFIG.quebraCabecasBing.valor;
                bonusPerDay[d].items.push({ value: BONUS_CONFIG.quebraCabecasBing.valor, name: BONUS_CONFIG.quebraCabecasBing.nome });
                consecutiveDays = 0; // Resetar para o próximo grupo
                groupStart = 0;
            }
        } else {
            // Dia vazio ou sem pontos, resetar contador
            consecutiveDays = 0;
            groupStart = 0;
        }
    }

    // === BÔNUS 2: Bonus de Sequencia do Bing (10 dias de Conjunto Diario) ===
    let consecutiveDaysConjunto = 0;
    let groupStartConjunto = 0;
    
    // Contar dias consecutivos do final do mês anterior
    for (let d = prevMonthDaysForBonus; d >= 1; d--) {
        const dKey = `day${d}`;
        const dValue = data[prevMonthKeyForBonus]?.[dKey]?.conjuntodiario;
        if (dValue && dValue !== '' && dValue !== 0) {
            consecutiveDaysConjunto++;
        } else {
            break;
        }
    }
    
    // Se já havia dias consecutivos do mês anterior, ajustar
    if (consecutiveDaysConjunto > 0) {
        consecutiveDaysConjunto = Math.min(consecutiveDaysConjunto, 9); // Máximo 9 do mês anterior
    }
    
    // Processar dias do mês atual para detectar bônus de Conjunto Diario
    for (let d = 1; d <= daysInMonth; d++) {
        const dKey = `day${d}`;
        const dValue = data[monthKey][dKey]?.conjuntodiario;
        
        if (dValue && dValue !== '' && dValue !== 0) {
            if (consecutiveDaysConjunto === 0) {
                groupStartConjunto = d;
            }
            consecutiveDaysConjunto++;
            
            // Se completou 10 dias, adicionar bônus no 10º dia
            if (consecutiveDaysConjunto === 10) {
                if (!bonusPerDay[d]) {
                    bonusPerDay[d] = { total: 0, items: [] };
                }
                bonusPerDay[d].total += BONUS_CONFIG.bonusSequenciaBing.valor;
                bonusPerDay[d].items.push({ value: BONUS_CONFIG.bonusSequenciaBing.valor, name: BONUS_CONFIG.bonusSequenciaBing.nome });
                consecutiveDaysConjunto = 0; // Resetar para o próximo grupo
                groupStartConjunto = 0;
            }
        } else {
            // Dia vazio ou sem pontos, resetar contador
            consecutiveDaysConjunto = 0;
            groupStartConjunto = 0;
        }
    }

    // === BÔNUS 3: Bonus de Sequencia do Edge (DESABILITADO - nova lógica progressiva) ===
    // O bônus de 100 pontos não é mais creditado.
    // Agora o Edge usa sequência progressiva: 5 > 10 > 20 > 30 > 40 > 80 > 120
    
    /* CÓDIGO ORIGINAL COMENTADO:
    let consecutiveDaysEdge = 0;
    let groupStartEdge = 0;
    
    // Contar dias consecutivos do final do mês anterior
    for (let d = prevMonthDaysForBonus; d >= 1; d--) {
        const dKey = `day${d}`;
        const dValue = data[prevMonthKeyForBonus]?.[dKey]?.navegaredge;
        if (dValue && dValue !== '' && dValue !== 0) {
            consecutiveDaysEdge++;
        } else {
            break;
        }
    }
    
    // Se já havia dias consecutivos do mês anterior, ajustar
    if (consecutiveDaysEdge > 0) {
        consecutiveDaysEdge = Math.min(consecutiveDaysEdge, 6); // Máximo 6 do mês anterior
    }
    
    // Processar dias do mês atual para detectar bônus de Edge
    for (let d = 1; d <= daysInMonth; d++) {
        const dKey = `day${d}`;
        const dValue = data[monthKey][dKey]?.navegaredge;
        
        if (dValue && dValue !== '' && dValue !== 0) {
            if (consecutiveDaysEdge === 0) {
                groupStartEdge = d;
            }
            consecutiveDaysEdge++;
            
            // Se completou 7 dias, adicionar bônus no 7º dia
            if (consecutiveDaysEdge === 7) {
                if (!bonusPerDay[d]) {
                    bonusPerDay[d] = { total: 0, items: [] };
                }
                bonusPerDay[d].total += BONUS_CONFIG.bonusSequenciaEdge.valor;
                bonusPerDay[d].items.push({ value: BONUS_CONFIG.bonusSequenciaEdge.valor, name: BONUS_CONFIG.bonusSequenciaEdge.nome });
                consecutiveDaysEdge = 0; // Resetar para o próximo grupo
                groupStartEdge = 0;
            }
        } else {
            // Dia vazio ou sem pontos, resetar contador
            consecutiveDaysEdge = 0;
            groupStartEdge = 0;
        }
    }
    */

    // === BÔNUS 4: Sequencias Semanais Gamepass (7 dias de Jogar um jogo pelo Gamepass) ===
    let consecutiveDaysGamepass = 0;
    let groupStartGamepass = 0;
    
    // Contar dias consecutivos do final do mês anterior
    for (let d = prevMonthDaysForBonus; d >= 1; d--) {
        const dKey = `day${d}`;
        const dValue = data[prevMonthKeyForBonus]?.[dKey]?.playgamepass;
        if (dValue && dValue !== '' && dValue !== 0) {
            consecutiveDaysGamepass++;
        } else {
            break;
        }
    }
    
    // Se já havia dias consecutivos do mês anterior, ajustar
    if (consecutiveDaysGamepass > 0) {
        consecutiveDaysGamepass = Math.min(consecutiveDaysGamepass, 6); // Máximo 6 do mês anterior
    }
    
    // Processar dias do mês atual para detectar bônus de Gamepass
    for (let d = 1; d <= daysInMonth; d++) {
        const dKey = `day${d}`;
        const dValue = data[monthKey][dKey]?.playgamepass;
        
        if (dValue && dValue !== '' && dValue !== 0) {
            if (consecutiveDaysGamepass === 0) {
                groupStartGamepass = d;
            }
            consecutiveDaysGamepass++;
            
            // Se completou 7 dias, adicionar bônus no 7º dia
            if (consecutiveDaysGamepass === 7) {
                if (!bonusPerDay[d]) {
                    bonusPerDay[d] = { total: 0, items: [] };
                }
                bonusPerDay[d].total += BONUS_CONFIG.sequenciasSemanaisGamepass.valor;
                bonusPerDay[d].items.push({ value: BONUS_CONFIG.sequenciasSemanaisGamepass.valor, name: BONUS_CONFIG.sequenciasSemanaisGamepass.nome });
                consecutiveDaysGamepass = 0; // Resetar para o próximo grupo
                groupStartGamepass = 0;
            }
        } else {
            // Dia vazio ou sem pontos, resetar contador
            consecutiveDaysGamepass = 0;
            groupStartGamepass = 0;
        }
    }

    // === BÔNUS 5: Bonus Semanal do PC (5 dias de Console em uma semana) ===
    // Verificar se há uma semana do mês anterior que continua neste mês
    const prevMonthConsole = currentMonth - 1;
    const prevYearConsole = prevMonthConsole < 0 ? currentYear - 1 : currentYear;
    const prevMonthIndexConsole = prevMonthConsole < 0 ? 11 : prevMonthConsole;
    const prevMonthKeyConsole = `${prevYearConsole}-${prevMonthIndexConsole}`;
    const prevMonthDaysConsole = getDaysInMonth(prevYearConsole, prevMonthIndexConsole);
    
    let markedDaysFromPrevMonthConsole = [];
    let countFromPrevMonthConsole = 0;
    
    // Verificar os últimos dias do mês anterior para uma semana que continua
    for (let d = prevMonthDaysConsole; d >= 1; d--) {
        const dayOfWeek = getDayOfWeek(prevYearConsole, prevMonthIndexConsole, d);
        if (dayOfWeek === 0) break; // Chegou no domingo, parar
        
        const dKey = `day${d}`;
        const dValue = data[prevMonthKeyConsole]?.[dKey]?.playconsole;
        if (dValue && dValue !== '') {
            markedDaysFromPrevMonthConsole.unshift(d);
            countFromPrevMonthConsole++;
        }
    }
    
    // Processar cada semana do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = getDayOfWeek(currentYear, currentMonth, d);
        
        // Se for segunda-feira ou primeiro dia do mês, começar uma nova semana
        if (dayOfWeek === 1 || d === 1) {
            // Encontrar o domingo dessa semana (ou último dia do mês)
            let weekEnd = d;
            for (let wd = d; wd <= daysInMonth; wd++) {
                const wdDayOfWeek = getDayOfWeek(currentYear, currentMonth, wd);
                weekEnd = wd;
                if (wdDayOfWeek === 0) break; // Domingo
            }
            
            // Contar dias marcados nesta semana
            let markedDays = [];
            for (let wd = d; wd <= weekEnd; wd++) {
                const wdKey = `day${wd}`;
                const wdValue = data[monthKey][wdKey]?.playconsole;
                if (wdValue && wdValue !== '') {
                    markedDays.push(wd);
                }
            }
            
            // Se é a primeira semana do mês e há dias do mês anterior
            if (d === 1 && countFromPrevMonthConsole > 0) {
                // Combinar com dias do mês anterior
                const totalMarked = countFromPrevMonthConsole + markedDays.length;
                if (totalMarked >= 5) {
                    // Adicionar bônus no 5º dia marcado (considerando dias do mês anterior)
                    const remainingToFive = 5 - countFromPrevMonthConsole;
                    if (remainingToFive > 0 && markedDays.length >= remainingToFive) {
                        const fifthDayIndex = remainingToFive - 1;
                        const fifthDay = markedDays[fifthDayIndex];
                        
                        if (!bonusPerDay[fifthDay]) {
                            bonusPerDay[fifthDay] = { total: 0, items: [] };
                        }
                        bonusPerDay[fifthDay].total += BONUS_CONFIG.bonusSemanalConsole.valor;
                        bonusPerDay[fifthDay].items.push({ value: BONUS_CONFIG.bonusSemanalConsole.valor, name: BONUS_CONFIG.bonusSemanalConsole.nome });
                    }
                }
            } else {
                // Semana normal dentro do mês
                if (markedDays.length >= 5) {
                    // Adicionar bônus no 5º dia marcado
                    const fifthDay = markedDays[4]; // índice 4 = 5º dia
                    
                    if (!bonusPerDay[fifthDay]) {
                        bonusPerDay[fifthDay] = { total: 0, items: [] };
                    }
                    bonusPerDay[fifthDay].total += BONUS_CONFIG.bonusSemanalConsole.valor;
                    bonusPerDay[fifthDay].items.push({ value: BONUS_CONFIG.bonusSemanalConsole.valor, name: BONUS_CONFIG.bonusSemanalConsole.nome });
                }
            }
            
            // Pular para o próximo dia após o domingo desta semana
            d = weekEnd;
        }
    }

    // === BÔNUS 6: Bonus Semanal do Windows (5 dias de Windows em uma semana) ===
    // Verificar se há uma semana do mês anterior que continua neste mês
    const prevMonthWindows = currentMonth - 1;
    const prevYearWindows = prevMonthWindows < 0 ? currentYear - 1 : currentYear;
    const prevMonthIndexWindows = prevMonthWindows < 0 ? 11 : prevMonthWindows;
    const prevMonthKeyWindows = `${prevYearWindows}-${prevMonthIndexWindows}`;
    const prevMonthDaysWindows = getDaysInMonth(prevYearWindows, prevMonthIndexWindows);
    
    let markedDaysFromPrevMonthWindows = [];
    let countFromPrevMonthWindows = 0;
    
    // Verificar os últimos dias do mês anterior para uma semana que continua
    for (let d = prevMonthDaysWindows; d >= 1; d--) {
        const dayOfWeek = getDayOfWeek(prevYearWindows, prevMonthIndexWindows, d);
        if (dayOfWeek === 0) break; // Chegou no domingo, parar
        
        const dKey = `day${d}`;
        const dValue = data[prevMonthKeyWindows]?.[dKey]?.playwindows;
        if (dValue && dValue !== '') {
            markedDaysFromPrevMonthWindows.unshift(d);
            countFromPrevMonthWindows++;
        }
    }
    
    // Processar cada semana do mês atual
    for (let d = 1; d <= daysInMonth; d++) {
        const dayOfWeek = getDayOfWeek(currentYear, currentMonth, d);
        
        // Se for segunda-feira ou primeiro dia do mês, começar uma nova semana
        if (dayOfWeek === 1 || d === 1) {
            // Encontrar o domingo dessa semana (ou último dia do mês)
            let weekEnd = d;
            for (let wd = d; wd <= daysInMonth; wd++) {
                const wdDayOfWeek = getDayOfWeek(currentYear, currentMonth, wd);
                weekEnd = wd;
                if (wdDayOfWeek === 0) break; // Domingo
            }
            
            // Contar dias marcados nesta semana
            let markedDays = [];
            for (let wd = d; wd <= weekEnd; wd++) {
                const wdKey = `day${wd}`;
                const wdValue = data[monthKey][wdKey]?.playwindows;
                if (wdValue && wdValue !== '') {
                    markedDays.push(wd);
                }
            }
            
            // Se é a primeira semana do mês e há dias do mês anterior
            if (d === 1 && countFromPrevMonthWindows > 0) {
                // Combinar com dias do mês anterior
                const totalMarked = countFromPrevMonthWindows + markedDays.length;
                if (totalMarked >= 5) {
                    // Adicionar bônus no 5º dia marcado (considerando dias do mês anterior)
                    const remainingToFive = 5 - countFromPrevMonthWindows;
                    if (remainingToFive > 0 && markedDays.length >= remainingToFive) {
                        const fifthDayIndex = remainingToFive - 1;
                        const fifthDay = markedDays[fifthDayIndex];
                        
                        if (!bonusPerDay[fifthDay]) {
                            bonusPerDay[fifthDay] = { total: 0, items: [] };
                        }
                        bonusPerDay[fifthDay].total += BONUS_CONFIG.bonusSemanalWindows.valor;
                        bonusPerDay[fifthDay].items.push({ value: BONUS_CONFIG.bonusSemanalWindows.valor, name: BONUS_CONFIG.bonusSemanalWindows.nome });
                    }
                }
            } else {
                // Semana normal dentro do mês
                if (markedDays.length >= 5) {
                    // Adicionar bônus no 5º dia marcado
                    const fifthDay = markedDays[4]; // índice 4 = 5º dia
                    
                    if (!bonusPerDay[fifthDay]) {
                        bonusPerDay[fifthDay] = { total: 0, items: [] };
                    }
                    bonusPerDay[fifthDay].total += BONUS_CONFIG.bonusSemanalWindows.valor;
                    bonusPerDay[fifthDay].items.push({ value: BONUS_CONFIG.bonusSemanalWindows.valor, name: BONUS_CONFIG.bonusSemanalWindows.nome });
                }
            }
            
            // Pular para o próximo dia após o domingo desta semana
            d = weekEnd;
        }
    }

    // === ADICIONAR BÔNUS EXTRAS PERSONALIZADOS ===
    // Verificar se existem bônus extras salvos para este mês
    if (data[monthKey].extraBonuses) {
        for (let d = 1; d <= daysInMonth; d++) {
            const dayKey = `day${d}`;
            const extraBonusesForDay = data[monthKey].extraBonuses[dayKey];
            
            if (extraBonusesForDay && extraBonusesForDay.length > 0) {
                if (!bonusPerDay[d]) {
                    bonusPerDay[d] = { total: 0, items: [] };
                }
                
                // Adicionar cada bônus extra ao dia
                extraBonusesForDay.forEach(extraBonus => {
                    bonusPerDay[d].total += extraBonus.points;
                    bonusPerDay[d].items.push({ 
                        value: extraBonus.points, 
                        name: extraBonus.title 
                    });
                });
            }
        }
    }

    // === CALCULAR SAQUES POR DIA ===
    let saquePerDay = {};
    if (data[monthKey].saques) {
        for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = `day${day}`;
            const saquesForDay = data[monthKey].saques[dayKey];
            
            if (saquesForDay && saquesForDay.length > 0) {
                let totalSaque = 0;
                let items = [];
                saquesForDay.forEach(saque => {
                    totalSaque += saque.points;
                    items.push({ value: saque.points, name: saque.title });
                });
                saquePerDay[day] = { total: totalSaque, items: items };
            }
        }
    }

    // Linha de Acumulado (Soma acumulada até o dia, continuando de todos os meses anteriores)
    html += '<tr><td class="row-header">Acumulado</td>';
    
    // Buscar o acumulado de TODOS os meses anteriores
    let accumulated = 0;
    
    // Percorrer todos os meses desde o início até o mês anterior ao atual
    for (let year = 2024; year <= currentYear; year++) {
        const maxMonth = (year === currentYear) ? currentMonth - 1 : 11;
        for (let month = 0; month <= maxMonth; month++) {
            const checkMonthKey = `${year}-${month}`;
            if (data[checkMonthKey]) {
                const monthDays = getDaysInMonth(year, month);
                // Somar todos os dias deste mês (incluindo pontos normais e bônus extras)
                for (let d = 1; d <= monthDays; d++) {
                    const dKey = `day${d}`;
                    const dPoints = data[checkMonthKey][dKey]?.pontos || 0;
                    accumulated += parseInt(dPoints) || 0;
                    
                    // Adicionar bônus extras deste mês anterior
                    if (data[checkMonthKey].extraBonuses && data[checkMonthKey].extraBonuses[dKey]) {
                        const extraBonuses = data[checkMonthKey].extraBonuses[dKey];
                        extraBonuses.forEach(bonus => {
                            accumulated += parseInt(bonus.points) || 0;
                        });
                    }
                    
                    // Subtrair saques deste mês anterior
                    if (data[checkMonthKey].saques && data[checkMonthKey].saques[dKey]) {
                        const saques = data[checkMonthKey].saques[dKey];
                        saques.forEach(saque => {
                            accumulated -= parseInt(saque.points) || 0;
                        });
                    }
                }
            }
        }
    }
    
    // Agora adicionar os dias do mês atual (incluindo bônus e subtraindo saques)
    for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `day${day}`;
        const dayPoints = data[monthKey][dayKey]?.pontos || 0;
        const dayBonus = bonusPerDay[day] ? bonusPerDay[day].total : 0;
        const daySaque = saquePerDay[day] ? saquePerDay[day].total : 0;
        accumulated += parseInt(dayPoints) || 0;
        accumulated += parseInt(dayBonus) || 0;
        accumulated -= parseInt(daySaque) || 0;
        html += `<td class="points-row">${accumulated}</td>`;
    }
    html += '</tr>';

    // Linha de Total Dia (Pontos do dia + bônus)
    // Calcular total de pontos do mês (pontos + bônus - saques)
    let totalPontosMes = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `day${day}`;
        const pointsValue = data[monthKey][dayKey]?.pontos || 0;
        const dayBonus = bonusPerDay[day] ? bonusPerDay[day].total : 0;
        const daySaque = saquePerDay[day] ? saquePerDay[day].total : 0;
        totalPontosMes += (parseInt(pointsValue) || 0) + (parseInt(dayBonus) || 0) - (parseInt(daySaque) || 0);
    }
    
    html += `<tr><td class="row-header">Total de pontos<br/> (${totalPontosMes} pts.)</td>`;
    for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `day${day}`;
        const pointsValue = data[monthKey][dayKey]?.pontos || 0;
        const dayBonus = bonusPerDay[day] ? bonusPerDay[day].total : 0;
        const totalDay = (parseInt(pointsValue) || 0) + (parseInt(dayBonus) || 0);
        const displayValue = totalDay > 0 ? totalDay : '';
        html += `<td class="points-row">${displayValue}</td>`;
    }
    html += '</tr>';

    // Linhas de atividades
    activities.forEach(activity => {
        html += `<tr><td class="row-header sub" style="background: ${activity.color}; border-width: 0px">${activity.name}</td>`;
        
        // Para Conjunto Diario, Pesquisas Bing PC e Navegar com Edge, primeiro identificar todos os grupos no mês
        let groups = [];
        const groupDays = activity.id === 'conjuntodiario' ? 10 : activity.id === 'pesquisabingpc' ? 7 : activity.id === 'navegaredge' ? 7 : activity.id === 'playgamepass' ? 7 : 0;
        
        // Para playconsole, identificar grupos de 5 dias dentro de cada semana
        let consoleGroups = [];
        if (activity.id === 'playconsole') {
            // Verificar se há uma semana do mês anterior que continua neste mês
            const prevMonth = currentMonth - 1;
            const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
            const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
            const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
            const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
            
            let markedDaysFromPrevMonth = [];
            let countFromPrevMonth = 0;
            
            // Verificar os últimos dias do mês anterior para uma semana que continua
            for (let d = prevMonthDays; d >= 1; d--) {
                const dayOfWeek = getDayOfWeek(prevYear, prevMonthIndex, d);
                if (dayOfWeek === 0) break; // Chegou no domingo, parar
                
                const dKey = `day${d}`;
                const dValue = data[prevMonthKey]?.[dKey]?.[activity.id];
                if (dValue && dValue !== '') {
                    markedDaysFromPrevMonth.unshift(d); // Adicionar no início
                    countFromPrevMonth++;
                }
            }
            
            // Processar cada semana do mês atual
            for (let d = 1; d <= daysInMonth; d++) {
                const dayOfWeek = getDayOfWeek(currentYear, currentMonth, d);
                
                // Se for segunda-feira ou primeiro dia do mês, começar uma nova semana
                if (dayOfWeek === 1 || d === 1) {
                    // Encontrar o domingo dessa semana (ou último dia do mês)
                    let weekEnd = d;
                    for (let wd = d; wd <= daysInMonth; wd++) {
                        const wdDayOfWeek = getDayOfWeek(currentYear, currentMonth, wd);
                        weekEnd = wd;
                        if (wdDayOfWeek === 0) break; // Domingo
                    }
                    
                    // Contar dias marcados nesta semana
                    let markedDays = [];
                    for (let wd = d; wd <= weekEnd; wd++) {
                        const wdKey = `day${wd}`;
                        const wdValue = data[monthKey][wdKey]?.[activity.id];
                        if (wdValue && wdValue !== '') {
                            markedDays.push(wd);
                        }
                    }
                    
                    // Se é a primeira semana do mês e há dias do mês anterior
                    if (d === 1 && countFromPrevMonth > 0) {
                        // Combinar com dias do mês anterior
                        const totalMarked = countFromPrevMonth + markedDays.length;
                        const remainingSlots = Math.max(0, 5 - countFromPrevMonth);
                        const daysWithBorder = markedDays.slice(0, remainingSlots);
                        
                        if (daysWithBorder.length > 0) {
                            consoleGroups.push({
                                start: daysWithBorder[0],
                                end: daysWithBorder[daysWithBorder.length - 1],
                                weekStart: d,
                                weekEnd: weekEnd,
                                daysWithBorder: daysWithBorder,
                                continuesFromPrevMonth: true
                            });
                        }
                    } else {
                        // Semana normal dentro do mês
                        if (markedDays.length > 0) {
                            const daysWithBorder = markedDays.slice(0, 5);
                            
                            if (daysWithBorder.length > 0) {
                                consoleGroups.push({
                                    start: daysWithBorder[0],
                                    end: daysWithBorder[daysWithBorder.length - 1],
                                    weekStart: d,
                                    weekEnd: weekEnd,
                                    daysWithBorder: daysWithBorder
                                });
                            }
                        }
                    }
                    
                    // Pular para o próximo dia após o domingo desta semana
                    d = weekEnd;
                }
            }
        }
        
        // Para playwindows, identificar grupos de 5 dias dentro de cada semana
        let windowsGroups = [];
        if (activity.id === 'playwindows') {
            // Verificar se há uma semana do mês anterior que continua neste mês
            const prevMonth = currentMonth - 1;
            const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
            const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
            const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
            const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
            
            let markedDaysFromPrevMonth = [];
            let countFromPrevMonth = 0;
            
            // Verificar os últimos dias do mês anterior para uma semana que continua
            for (let d = prevMonthDays; d >= 1; d--) {
                const dayOfWeek = getDayOfWeek(prevYear, prevMonthIndex, d);
                if (dayOfWeek === 0) break; // Chegou no domingo, parar
                
                const dKey = `day${d}`;
                const dValue = data[prevMonthKey]?.[dKey]?.[activity.id];
                if (dValue && dValue !== '') {
                    markedDaysFromPrevMonth.unshift(d); // Adicionar no início
                    countFromPrevMonth++;
                }
            }
            
            // Processar cada semana do mês atual
            for (let d = 1; d <= daysInMonth; d++) {
                const dayOfWeek = getDayOfWeek(currentYear, currentMonth, d);
                
                // Se for segunda-feira ou primeiro dia do mês, começar uma nova semana
                if (dayOfWeek === 1 || d === 1) {
                    // Encontrar o domingo dessa semana (ou último dia do mês)
                    let weekEnd = d;
                    for (let wd = d; wd <= daysInMonth; wd++) {
                        const wdDayOfWeek = getDayOfWeek(currentYear, currentMonth, wd);
                        weekEnd = wd;
                        if (wdDayOfWeek === 0) break; // Domingo
                    }
                    
                    // Contar dias marcados nesta semana
                    let markedDays = [];
                    for (let wd = d; wd <= weekEnd; wd++) {
                        const wdKey = `day${wd}`;
                        const wdValue = data[monthKey][wdKey]?.[activity.id];
                        if (wdValue && wdValue !== '') {
                            markedDays.push(wd);
                        }
                    }
                    
                    // Se é a primeira semana do mês e há dias do mês anterior
                    if (d === 1 && countFromPrevMonth > 0) {
                        // Combinar com dias do mês anterior
                        const totalMarked = countFromPrevMonth + markedDays.length;
                        const remainingSlots = Math.max(0, 5 - countFromPrevMonth);
                        const daysWithBorder = markedDays.slice(0, remainingSlots);
                        
                        if (daysWithBorder.length > 0) {
                            windowsGroups.push({
                                start: daysWithBorder[0],
                                end: daysWithBorder[daysWithBorder.length - 1],
                                weekStart: d,
                                weekEnd: weekEnd,
                                daysWithBorder: daysWithBorder,
                                continuesFromPrevMonth: true
                            });
                        }
                    } else {
                        // Semana normal dentro do mês
                        if (markedDays.length > 0) {
                            const daysWithBorder = markedDays.slice(0, 5);
                            
                            if (daysWithBorder.length > 0) {
                                windowsGroups.push({
                                    start: daysWithBorder[0],
                                    end: daysWithBorder[daysWithBorder.length - 1],
                                    weekStart: d,
                                    weekEnd: weekEnd,
                                    daysWithBorder: daysWithBorder
                                });
                            }
                        }
                    }
                    
                    // Pular para o próximo dia após o domingo desta semana
                    d = weekEnd;
                }
            }
        }
        
        // Para useappxbox, identificar grupos de ciclo (8 -> 16 -> 24 -> 32 -> 50)
        let xboxGroups = [];
        if (activity.id === 'useappxbox') {
            // Ciclo de valores: 8, 16, 24, 32, 50
            const cycleValues = [8, 16, 24, 32, 50];
            
            // Verificar se há um grupo do mês anterior que continua neste mês
            const prevMonth = currentMonth - 1;
            const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
            const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
            const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
            const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
            
            let startingValueIndex = -1; // -1 significa começar do 8
            
            // Verificar o último dia do mês anterior
            if (data[prevMonthKey]) {
                const lastDayPrevMonthKey = `day${prevMonthDays}`;
                const lastDayPrevMonthValue = data[prevMonthKey][lastDayPrevMonthKey]?.[activity.id];
                
                // Se o mês anterior terminou no meio de um ciclo, continuar
                if (lastDayPrevMonthValue && lastDayPrevMonthValue !== 50) {
                    startingValueIndex = cycleValues.indexOf(lastDayPrevMonthValue);
                }
            }
            
            for (let d = 1; d <= daysInMonth; d++) {
                const dKey = `day${d}`;
                const dValue = data[monthKey][dKey]?.[activity.id];
                
                // Se é o primeiro dia e continua do mês anterior
                if (d === 1 && startingValueIndex >= 0) {
                    const expectedNextIndex = startingValueIndex + 1;
                    if (expectedNextIndex < cycleValues.length && dValue === cycleValues[expectedNextIndex]) {
                        let groupStart = 1;
                        let groupEnd = 1;
                        let currentValueIndex = expectedNextIndex;
                        
                        // Procurar a sequência até o fim do ciclo ou um gap
                        for (let checkDay = 2; checkDay <= daysInMonth; checkDay++) {
                            const checkKey = `day${checkDay}`;
                            const checkValue = data[monthKey][checkKey]?.[activity.id];
                            
                            if (!checkValue || checkValue === '') {
                                break;
                            }
                            
                            const nextExpectedIndex = currentValueIndex + 1;
                            if (nextExpectedIndex < cycleValues.length && checkValue === cycleValues[nextExpectedIndex]) {
                                groupEnd = checkDay;
                                currentValueIndex = nextExpectedIndex;
                                
                                if (checkValue === 50) {
                                    break;
                                }
                            } else {
                                break;
                            }
                        }
                        
                        xboxGroups.push({
                            start: groupStart,
                            end: groupEnd,
                            continuesFromPrevMonth: true
                        });
                        
                        d = groupEnd;
                        continue;
                    }
                }
                
                // Se encontrou um valor 8 (início do ciclo)
                if (dValue === 8) {
                    let groupStart = d;
                    let groupEnd = d;
                    let currentValueIndex = 0; // Começa no 8
                    
                    // Procurar a sequência até o fim do ciclo ou um gap
                    for (let checkDay = d + 1; checkDay <= daysInMonth; checkDay++) {
                        const checkKey = `day${checkDay}`;
                        const checkValue = data[monthKey][checkKey]?.[activity.id];
                        
                        if (!checkValue || checkValue === '') {
                            // Gap encontrado, encerrar grupo
                            break;
                        }
                        
                        // Verificar se é o próximo valor esperado no ciclo
                        const expectedNextIndex = currentValueIndex + 1;
                        if (expectedNextIndex < cycleValues.length && checkValue === cycleValues[expectedNextIndex]) {
                            groupEnd = checkDay;
                            currentValueIndex = expectedNextIndex;
                            
                            // Se chegou no 50, encerrar grupo
                            if (checkValue === 50) {
                                break;
                            }
                        } else {
                            // Valor não esperado, encerrar grupo
                            break;
                        }
                    }
                    
                    // Adicionar grupo se tiver mais de um dia ou se terminou no meio do ciclo
                    if (groupEnd > groupStart || data[monthKey][`day${groupEnd}`]?.[activity.id] !== 8) {
                        xboxGroups.push({
                            start: groupStart,
                            end: groupEnd
                        });
                    }
                    
                    // Pular para depois do grupo
                    d = groupEnd;
                }
            }
        }
        
        if (groupDays > 0) {
            // Verificar se há um grupo do mês anterior que continua neste mês
            const prevMonth = currentMonth - 1;
            const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
            const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
            const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
            const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
            
            // Verificar os últimos (groupDays-1) dias do mês anterior para grupos que continuam
            for (let d = Math.max(1, prevMonthDays - (groupDays - 2)); d <= prevMonthDays; d++) {
                const dKey = `day${d}`;
                const dValue = data[prevMonthKey]?.[dKey]?.[activity.id];
                
                if (dValue && dValue !== '') {
                    // Verificar se é início de grupo
                    const prevDKey = `day${d - 1}`;
                    const prevDValue = data[prevMonthKey]?.[prevDKey]?.[activity.id];
                    
                    if (d === 1 || !prevDValue || prevDValue === '') {
                        // Este grupo pode continuar no mês atual
                        const groupStart = d;
                        const daysFromPrevMonth = prevMonthDays - d + 1;
                        const daysInCurrentMonth = groupDays - daysFromPrevMonth;
                        
                        if (daysInCurrentMonth > 0) {
                            // Este grupo continua no mês atual
                            groups.push({ 
                                start: 1, 
                                end: Math.min(daysInCurrentMonth, daysInMonth),
                                crossMonth: true,
                                prevMonthStart: groupStart
                            });
                        }
                        break;
                    }
                }
            }
            
            let skipUntilDay = groups.length > 0 ? groups[0].end : 0;
            
            for (let d = 1; d <= daysInMonth; d++) {
                if (d <= skipUntilDay) continue;
                
                const dKey = `day${d}`;
                const dValue = data[monthKey][dKey]?.[activity.id];
                
                if (dValue && dValue !== '') {
                    // Este é o início de um grupo
                    const groupStart = d;
                    const maxPossibleEnd = d + (groupDays - 1);
                    let groupEnd = Math.min(maxPossibleEnd, daysInMonth);
                    
                    // Verificar se há um GAP dentro do mês atual
                    for (let checkDay = d; checkDay < groupEnd; checkDay++) {
                        const currentKey = `day${checkDay}`;
                        const currentValue = data[monthKey][currentKey]?.[activity.id];
                        const nextKey = `day${checkDay + 1}`;
                        const nextValue = data[monthKey][nextKey]?.[activity.id];
                        
                        if ((currentValue && currentValue !== '') && (!nextValue || nextValue === '')) {
                            let hasValueAfterGap = false;
                            for (let futureDay = checkDay + 2; futureDay <= groupEnd; futureDay++) {
                                const futureKey = `day${futureDay}`;
                                const futureValue = data[monthKey][futureKey]?.[activity.id];
                                if (futureValue && futureValue !== '') {
                                    hasValueAfterGap = true;
                                    break;
                                }
                            }
                            
                            if (hasValueAfterGap) {
                                groupEnd = checkDay;
                                break;
                            }
                        }
                    }
                    
                    const extendsToNextMonth = maxPossibleEnd > daysInMonth;
                    
                    groups.push({ 
                        start: groupStart, 
                        end: groupEnd,
                        extendsToNextMonth: extendsToNextMonth
                    });
                    skipUntilDay = groupEnd;
                }
            }
        }
        
        for (let day = 1; day <= daysInMonth; day++) {
            const dayKey = `day${day}`;
            const value = data[monthKey][dayKey]?.[activity.id] || '';
            const dayOfWeek = getDayOfWeek(currentYear, currentMonth, day);
            
            // Determinar se deve ter borda de grupo (para Conjunto Diario, Pesquisas Bing PC e Navegar com Edge)
            let borderClasses = [];
            if (activity.id === 'conjuntodiario' || activity.id === 'pesquisabingpc' || activity.id === 'navegaredge') {
                // Verificar se este dia está dentro de algum grupo
                for (let group of groups) {
                    if (day >= group.start && day <= group.end) {
                        // Este dia faz parte de um grupo
                        borderClasses.push('group-border-top');
                        borderClasses.push('group-border-bottom');
                        borderClasses.push('group-background');
                        
                        // Borda esquerda no primeiro dia do grupo
                        if (day === group.start) {
                            borderClasses.push('group-border-left');
                        } else {
                            // Dentro do grupo, remover borda esquerda fina
                            borderClasses.push('group-inside-left');
                        }
                        
                        // Borda direita no último dia do grupo
                        if (day === group.end) {
                            borderClasses.push('group-border-right');
                        } else {
                            // Dentro do grupo, remover borda direita fina
                            borderClasses.push('group-inside-right');
                        }
                        break; // Só pode estar em um grupo
                    }
                }
            }
            // Para playgamepass, verificar se é segunda-feira (início de semana) ou domingo (fim de semana)
            else if (activity.id === 'playgamepass') {
                const dayOfWeek = getDayOfWeek(currentYear, currentMonth, day);
                
                // Segunda-feira (1) = início da semana
                if (dayOfWeek === 1) {
                    borderClasses.push('group-border-left');
                    borderClasses.push('group-border-top');
                    borderClasses.push('group-border-bottom');
                }
                // Domingo (0) = fim da semana
                else if (dayOfWeek === 0) {
                    borderClasses.push('group-border-right');
                    borderClasses.push('group-border-top');
                    borderClasses.push('group-border-bottom');
                }
                // Terça a Sábado (2-6) = meio da semana
                else {
                    borderClasses.push('group-border-top');
                    borderClasses.push('group-border-bottom');
                    borderClasses.push('group-inside-left');
                    borderClasses.push('group-inside-right');
                }
            }
            // Para playconsole, verificar se está em um grupo de 5 dias
            else if (activity.id === 'playconsole') {
                // Verificar se este dia está dentro de algum grupo
                for (let group of consoleGroups) {
                    // Verificar se este dia está nos primeiros 5 dias marcados
                    if (group.daysWithBorder.includes(day)) {
                        // Este dia faz parte do grupo de 5 dias com borda
                        borderClasses.push('group-border-top');
                        borderClasses.push('group-border-bottom');
                        borderClasses.push('group-background');
                        
                        // Borda esquerda no primeiro dia do grupo
                        if (day === group.start) {
                            borderClasses.push('group-border-left');
                        } else {
                            // Dentro do grupo, remover borda esquerda fina
                            borderClasses.push('group-inside-left');
                        }
                        
                        // Borda direita no último dia do grupo
                        if (day === group.end) {
                            borderClasses.push('group-border-right');
                        } else {
                            // Dentro do grupo, remover borda direita fina
                            borderClasses.push('group-inside-right');
                        }
                        break;
                    } 
                    // Verificar se é um dia vazio ENTRE dias marcados (gap)
                    else if (day > group.start && day < group.end && !group.daysWithBorder.includes(day)) {
                        // Este é um gap - aplicar bordas para fechar
                        borderClasses.push('group-border-top');
                        borderClasses.push('group-border-bottom');
                        borderClasses.push('group-inside-left');
                        borderClasses.push('group-inside-right');
                        break;
                    }
                }
            }
            // Para playwindows, verificar se está em um grupo de 5 dias
            else if (activity.id === 'playwindows') {
                // Verificar se este dia está dentro de algum grupo
                for (let group of windowsGroups) {
                    // Verificar se este dia está nos primeiros 5 dias marcados
                    if (group.daysWithBorder.includes(day)) {
                        // Este dia faz parte do grupo de 5 dias com borda
                        borderClasses.push('group-border-top');
                        borderClasses.push('group-border-bottom');
                        borderClasses.push('group-background');
                        
                        // Borda esquerda no primeiro dia do grupo
                        if (day === group.start) {
                            borderClasses.push('group-border-left');
                        } else {
                            // Dentro do grupo, remover borda esquerda fina
                            borderClasses.push('group-inside-left');
                        }
                        
                        // Borda direita no último dia do grupo
                        if (day === group.end) {
                            borderClasses.push('group-border-right');
                        } else {
                            // Dentro do grupo, remover borda direita fina
                            borderClasses.push('group-inside-right');
                        }
                        break;
                    } 
                    // Verificar se é um dia vazio ENTRE dias marcados (gap)
                    else if (day > group.start && day < group.end && !group.daysWithBorder.includes(day)) {
                        // Este é um gap - aplicar bordas para fechar
                        borderClasses.push('group-border-top');
                        borderClasses.push('group-border-bottom');
                        borderClasses.push('group-inside-left');
                        borderClasses.push('group-inside-right');
                        break;
                    }
                }
            }
            // Para useappxbox, verificar se está em um grupo de ciclo
            else if (activity.id === 'useappxbox') {
                // Verificar se este dia está dentro de algum grupo
                for (let group of xboxGroups) {
                    if (day >= group.start && day <= group.end) {
                        // Este dia faz parte de um grupo
                        borderClasses.push('group-border-top');
                        borderClasses.push('group-border-bottom');
                        borderClasses.push('group-background');
                        
                        // Borda esquerda no primeiro dia do grupo
                        if (day === group.start) {
                            borderClasses.push('group-border-left');
                        } else {
                            // Dentro do grupo, remover borda esquerda fina
                            borderClasses.push('group-inside-left');
                        }
                        
                        // Borda direita no último dia do grupo
                        if (day === group.end) {
                            borderClasses.push('group-border-right');
                        } else {
                            // Dentro do grupo, remover borda direita fina
                            borderClasses.push('group-inside-right');
                        }
                        break;
                    }
                }
            }
            const borderClass = borderClasses.join(' ');
            
            // Se for o Conjunto Diario, usar select
            if (activity.id === 'conjuntodiario') {
                const emptyBgClass = (!value && !borderClass.includes('group-background')) ? 'group-empty-background' : '';
                const finalClass = `${borderClass} ${emptyBgClass}`.trim();
                html += `<td class="editable ${finalClass}">`;
                html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                html += `<option value="10" ${value === 10 ? 'selected' : ''}>10</option>`;
                html += `<option value="20" ${value === 20 ? 'selected' : ''}>20</option>`;
                html += `<option value="30" ${value === 30 ? 'selected' : ''}>30</option>`;
                html += `</select></td>`;
            }
            // Se for Mais Atividade, usar select com regras especiais
            else if (activity.id === 'maisatividade') {
                const hasValue = value !== '' && value !== null && value !== undefined;
                const bgClass = hasValue ? 'group-background' : 'group-empty-background';
                
                if (dayOfWeek === 0) {
                    // Domingo - desabilitado
                    html += `<td class="editable" style="background: #cccccc;">`;
                    html += `<select disabled>`;
                    html += `<option value="">-</option>`;
                    html += `</select></td>`;
                } else if (dayOfWeek === 6) {
                    // Sábado - apenas opção 5
                    html += `<td class="editable ${bgClass}">`;
                    html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                    html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                    html += `<option value="5" ${value === 5 ? 'selected' : ''}>5</option>`;
                    html += `</select></td>`;
                } else {
                    // Dias de semana - todas as opções
                    html += `<td class="editable ${bgClass}">`;
                    html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                    html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                    html += `<option value="5" ${value === 5 ? 'selected' : ''}>5</option>`;
                    html += `<option value="10" ${value === 10 ? 'selected' : ''}>10</option>`;
                    html += `<option value="15" ${value === 15 ? 'selected' : ''}>15</option>`;
                    html += `<option value="20" ${value === 20 ? 'selected' : ''}>20</option>`;
                    html += `<option value="25" ${value === 25 ? 'selected' : ''}>25</option>`;
                    html += `</select></td>`;
                }
            }
            // Se for Navegar com Edge, usar select com sequência progressiva: 5, 10, 20, 30, 40, 80, 120
            else if (activity.id === 'navegaredge') {
                // Determinar qual valor está disponível baseado no dia anterior
                const edgeSequence = [5, 10, 20, 30, 40, 80, 120];
                let availableOptions = ['']; // Sempre pode deixar vazio
                
                if (day > 1) {
                    const prevDayKey = `day${day - 1}`;
                    const prevValue = data[monthKey]?.[prevDayKey]?.navegaredge;
                    
                    if (prevValue && prevValue !== '' && prevValue !== 0) {
                        // Encontrar o índice do valor anterior na sequência
                        const prevIndex = edgeSequence.indexOf(parseInt(prevValue));
                        if (prevIndex !== -1 && prevIndex < edgeSequence.length - 1) {
                            // Próximo valor da sequência está disponível
                            availableOptions.push(edgeSequence[prevIndex + 1]);
                        } else if (prevIndex === edgeSequence.length - 1) {
                            // Completou a sequência (120), pode começar de novo
                            availableOptions.push(edgeSequence[0]);
                        }
                    } else {
                        // Dia anterior estava vazio, pode começar a sequência
                        availableOptions.push(edgeSequence[0]);
                    }
                } else {
                    // Primeiro dia do mês, verificar último dia do mês anterior
                    const prevMonth = currentMonth - 1;
                    const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
                    const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
                    const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
                    const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
                    const lastDayPrevMonth = `day${prevMonthDays}`;
                    const prevValue = data[prevMonthKey]?.[lastDayPrevMonth]?.navegaredge;
                    
                    if (prevValue && prevValue !== '' && prevValue !== 0) {
                        const prevIndex = edgeSequence.indexOf(parseInt(prevValue));
                        if (prevIndex !== -1 && prevIndex < edgeSequence.length - 1) {
                            availableOptions.push(edgeSequence[prevIndex + 1]);
                        } else if (prevIndex === edgeSequence.length - 1) {
                            availableOptions.push(edgeSequence[0]);
                        }
                    } else {
                        availableOptions.push(edgeSequence[0]);
                    }
                }
                
                const emptyBgClass = (!value && !borderClass.includes('group-background')) ? 'group-empty-background' : '';
                const finalClass = `${borderClass} ${emptyBgClass}`.trim();
                html += `<td class="editable ${finalClass}">`;
                html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                
                // Adicionar as opções disponíveis
                availableOptions.forEach(opt => {
                    if (opt !== '') {
                        html += `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`;
                    }
                });
                
                html += `</select></td>`;
            }
            // Se for Pesquisas Bing PC, validar múltiplos de 3 (máximo 150)
            else if (activity.id === 'pesquisabingpc') {
                const emptyBgClass = (!value && !borderClass.includes('group-background')) ? 'group-empty-background' : '';
                const finalClass = `${borderClass} ${emptyBgClass}`.trim();
                html += `<td class="editable ${finalClass}" 
                            onclick="editCell('${monthKey}', '${dayKey}', '${activity.id}', this)">
                            <input type="number" 
                                value="${value}" 
                                min="0"
                                max="150"
                                step="3"
                                onchange="validateMultipleOf3('${monthKey}', '${dayKey}', '${activity.id}', this, 150)">
                            </td>`;
            }
            // Se for Diaria do App Bing, usar select com opções baseadas no ciclo
            else if (activity.id === 'diariabing') {
                // Determinar qual opção está disponível baseado no dia anterior
                let availableOption = 5; // Padrão: começa com 5
                
                if (day > 1) {
                    // Verificar o valor do dia anterior
                    const prevDayKey = `day${day - 1}`;
                    const prevValue = data[monthKey][prevDayKey]?.diariabing;
                    
                    if (prevValue) {
                        // Definir próxima opção baseada no ciclo
                        if (prevValue === 5) {
                            // Verificar se é o primeiro ou segundo 5
                            let twoDaysAgoValue = null;
                            if (day > 2) {
                                const twoDaysAgoKey = `day${day - 2}`;
                                twoDaysAgoValue = data[monthKey][twoDaysAgoKey]?.diariabing;
                            } else if (day === 2) {
                                // Dia 2 do mês, verificar último dia do mês anterior
                                const prevMonth = currentMonth - 1;
                                const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
                                const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
                                const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
                                const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
                                const lastDayPrevMonthKey = `day${prevMonthDays}`;
                                twoDaysAgoValue = data[prevMonthKey]?.[lastDayPrevMonthKey]?.diariabing;
                            }
                            availableOption = (twoDaysAgoValue === 5) ? 10 : 5;
                        } else if (prevValue === 10) {
                            // Verificar se é o primeiro ou segundo 10
                            let twoDaysAgoValue = null;
                            if (day > 2) {
                                const twoDaysAgoKey = `day${day - 2}`;
                                twoDaysAgoValue = data[monthKey][twoDaysAgoKey]?.diariabing;
                            } else if (day === 2) {
                                // Dia 2 do mês, verificar último dia do mês anterior
                                const prevMonth = currentMonth - 1;
                                const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
                                const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
                                const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
                                const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
                                const lastDayPrevMonthKey = `day${prevMonthDays}`;
                                twoDaysAgoValue = data[prevMonthKey]?.[lastDayPrevMonthKey]?.diariabing;
                            }
                            availableOption = (twoDaysAgoValue === 10) ? 15 : 10;
                        } else if (prevValue === 15) {
                            // Verificar se é o primeiro ou segundo 15
                            let twoDaysAgoValue = null;
                            if (day > 2) {
                                const twoDaysAgoKey = `day${day - 2}`;
                                twoDaysAgoValue = data[monthKey][twoDaysAgoKey]?.diariabing;
                            } else if (day === 2) {
                                // Dia 2 do mês, verificar último dia do mês anterior
                                const prevMonth = currentMonth - 1;
                                const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
                                const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
                                const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
                                const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
                                const lastDayPrevMonthKey = `day${prevMonthDays}`;
                                twoDaysAgoValue = data[prevMonthKey]?.[lastDayPrevMonthKey]?.diariabing;
                            }
                            availableOption = (twoDaysAgoValue === 15) ? 50 : 15;
                        } else if (prevValue === 50) {
                            availableOption = 5; // Recomeça o ciclo
                        }
                    } else {
                        // Dia anterior vazio, começar com 5
                        availableOption = 5;
                    }
                } else {
                    // Primeiro dia do mês, verificar último dia do mês anterior
                    const prevMonth = currentMonth - 1;
                    const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
                    const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
                    const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
                    const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
                    const lastDayPrevMonthKey = `day${prevMonthDays}`;
                    const lastDayPrevMonthValue = data[prevMonthKey]?.[lastDayPrevMonthKey]?.diariabing;
                    
                    if (lastDayPrevMonthValue) {
                        if (lastDayPrevMonthValue === 5) {
                            const twoDaysAgoKey = `day${prevMonthDays - 1}`;
                            const twoDaysAgoValue = data[prevMonthKey]?.[twoDaysAgoKey]?.diariabing;
                            availableOption = (twoDaysAgoValue === 5) ? 10 : 5;
                        } else if (lastDayPrevMonthValue === 10) {
                            const twoDaysAgoKey = `day${prevMonthDays - 1}`;
                            const twoDaysAgoValue = data[prevMonthKey]?.[twoDaysAgoKey]?.diariabing;
                            availableOption = (twoDaysAgoValue === 10) ? 15 : 10;
                        } else if (lastDayPrevMonthValue === 15) {
                            const twoDaysAgoKey = `day${prevMonthDays - 1}`;
                            const twoDaysAgoValue = data[prevMonthKey]?.[twoDaysAgoKey]?.diariabing;
                            availableOption = (twoDaysAgoValue === 15) ? 50 : 15;
                        } else if (lastDayPrevMonthValue === 50) {
                            availableOption = 5;
                        }
                    }
                }
                
                const hasValue = value !== '' && value !== null && value !== undefined;
                const bgClass = hasValue ? 'bing-app-filled' : 'bing-app-empty';
                
                html += `<td class="editable ${bgClass}">`;
                html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                html += `<option value="${availableOption}" ${value === availableOption ? 'selected' : ''}>${availableOption}</option>`;
                html += `</select></td>`;
            }
            // Se for Noticias do App Bing, validar múltiplos de 3 (máximo 30)
            else if (activity.id === 'noticiasbing') {
                const hasValue = value !== '' && value !== null && value !== undefined;
                const bgClass = hasValue ? 'bing-app-filled' : 'bing-app-empty';
                
                html += `<td class="editable ${bgClass}" 
                            onclick="editCell('${monthKey}', '${dayKey}', '${activity.id}', this)">
                            <input type="number" 
                                value="${value}" 
                                min="0"
                                max="30"
                                step="3"
                                onchange="validateMultipleOf3('${monthKey}', '${dayKey}', '${activity.id}', this, 30)">
                            </td>`;
            }
            // Se for Jogar Jewels no Celular, usar select com opções 0 ou 10
            else if (activity.id === 'playjewels') {
                const greenBgClass = value ? 'green-app-filled' : 'green-app-empty';
                html += `<td class="editable ${greenBgClass}">`;
                html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                html += `<option value="10" ${value === 10 ? 'selected' : ''}>10</option>`;
                html += `</select></td>`;
            }
            // Se for Use o App Xbox no Celular, usar select com opções baseadas no ciclo
            else if (activity.id === 'useappxbox') {
                // Determinar qual opção está disponível baseado no dia anterior
                // Ciclo: 8 -> 16 -> 24 -> 32 -> 50 -> (volta ao 8)
                let availableOption = 8; // Padrão: começa com 8
                
                if (day > 1) {
                    // Verificar o valor do dia anterior
                    const prevDayKey = `day${day - 1}`;
                    const prevValue = data[monthKey][prevDayKey]?.useappxbox;
                    
                    if (prevValue) {
                        // Definir próxima opção baseada no ciclo
                        if (prevValue === 8) {
                            availableOption = 16;
                        } else if (prevValue === 16) {
                            availableOption = 24;
                        } else if (prevValue === 24) {
                            availableOption = 32;
                        } else if (prevValue === 32) {
                            availableOption = 50;
                        } else if (prevValue === 50) {
                            availableOption = 8; // Recomeça o ciclo
                        }
                    } else {
                        // Dia anterior vazio, começar com 8
                        availableOption = 8;
                    }
                } else {
                    // Primeiro dia do mês, verificar último dia do mês anterior
                    const prevMonth = currentMonth - 1;
                    const prevYear = prevMonth < 0 ? currentYear - 1 : currentYear;
                    const prevMonthIndex = prevMonth < 0 ? 11 : prevMonth;
                    const prevMonthKey = `${prevYear}-${prevMonthIndex}`;
                    const prevMonthDays = getDaysInMonth(prevYear, prevMonthIndex);
                    const lastDayPrevMonthKey = `day${prevMonthDays}`;
                    const lastDayPrevMonthValue = data[prevMonthKey]?.[lastDayPrevMonthKey]?.useappxbox;
                    
                    if (lastDayPrevMonthValue) {
                        if (lastDayPrevMonthValue === 8) {
                            availableOption = 16;
                        } else if (lastDayPrevMonthValue === 16) {
                            availableOption = 24;
                        } else if (lastDayPrevMonthValue === 24) {
                            availableOption = 32;
                        } else if (lastDayPrevMonthValue === 32) {
                            availableOption = 50;
                        } else if (lastDayPrevMonthValue === 50) {
                            availableOption = 8;
                        }
                    }
                }
                
                const emptyBgClass = (!value && !borderClass.includes('group-background')) ? 'group-empty-background' : '';
                const greenBgClass = value ? 'green-app-filled' : 'green-app-empty';
                const finalClass = `${borderClass} ${emptyBgClass} ${greenBgClass}`.trim();
                html += `<td class="editable ${finalClass}">`;
                html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                html += `<option value="${availableOption}" ${value === availableOption ? 'selected' : ''}>${availableOption}</option>`;
                html += `</select></td>`;
            }
            // Se for Jogar um jogo pelo Gamepass, usar select com opções 0 ou 20
            else if (activity.id === 'playgamepass') {
                const gameBgClass = value ? 'game-app-filled' : 'game-app-empty';
                const finalClass = `${borderClass} ${gameBgClass}`.trim();
                html += `<td class="editable ${finalClass}">`;
                html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                html += `<option value="20" ${value === 20 ? 'selected' : ''}>20</option>`;
                html += `</select></td>`;
            }
            // Se for Jogar um jogo no Console, usar select com opções 0 ou 20
            else if (activity.id === 'playconsole') {
                const emptyBgClass = (!value && !borderClass.includes('group-background')) ? 'group-empty-background' : '';
                const gameBgClass = value ? 'game-app-filled' : 'game-app-empty';
                const finalClass = `${borderClass} ${emptyBgClass} ${gameBgClass}`.trim();
                html += `<td class="editable ${finalClass}">`;
                html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                html += `<option value="20" ${value === 20 ? 'selected' : ''}>20</option>`;
                html += `</select></td>`;
            }
            // Se for Jogar um jogo no Windows, usar select com opções 0 ou 20
            else if (activity.id === 'playwindows') {
                const emptyBgClass = (!value && !borderClass.includes('group-background')) ? 'group-empty-background' : '';
                const gameBgClass = value ? 'game-app-filled' : 'game-app-empty';
                const finalClass = `${borderClass} ${emptyBgClass} ${gameBgClass}`.trim();
                html += `<td class="editable ${finalClass}">`;
                html += `<select onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)">`;
                html += `<option value="" ${value === '' ? 'selected' : ''}>-</option>`;
                html += `<option value="20" ${value === 20 ? 'selected' : ''}>20</option>`;
                html += `</select></td>`;
            }
            else {
                html += `<td class="editable ${borderClass}" 
                            onclick="editCell('${monthKey}', '${dayKey}', '${activity.id}', this)">
                            <input type="number" 
                                value="${value}" 
                                onchange="updateCell('${monthKey}', '${dayKey}', '${activity.id}', this.value)"
                                onblur="calculateDayTotal('${monthKey}', '${dayKey}')">
                            </td>`;
            }
        }
        html += '</tr>';
    });

    // Linha 1: Título "Pontuação Bonus" (aparece na coluna onde há bônus)
    html += '<tr style="height: 40px;">';
    html += '<td class="row-header" style="background: #F2F2F2; border: none; height: 40px;"></td>';
    for (let day = 1; day <= daysInMonth; day++) {
        const hasBonus = bonusPerDay[day];
        const bonusText = hasBonus ? 'Pontuação Bonus' : '';
        const bonusStyle = hasBonus 
            ? 'background: #000000; color: white; border: 3px solid #000000; border-bottom: none; height: 40px; text-align: center; font-weight: bold; font-size: 10px;'
            : 'background: #F2F2F2; border: none; height: 40px; text-align: center; font-weight: bold; font-size: 10px;';
        html += `<td style="${bonusStyle}">${bonusText}</td>`;
    }
    html += '</tr>';
    
    // Linha 2: Valores de bônus (+100 no 7º dia de cada grupo)
    html += '<tr style="height: 40px;">';
    html += '<td class="row-header" style="background: #F2F2F2; border: none; height: 40px;"></td>';
    for (let day = 1; day <= daysInMonth; day++) {
        const bonus = bonusPerDay[day];
        const bonusDisplay = bonus ? `${bonus.total}` : '';
        const valueStyle = bonus
            ? 'background: #F2F2F2; border: 3px solid #000000; border-top: none; height: 40px; text-align: center; font-weight: bold; color: #00B050; cursor: pointer;'
            : 'background: #F2F2F2; border: none; height: 40px; text-align: center; font-weight: bold; color: #00B050;';
        
        if (bonus) {
            // Construir tooltip com todos os bônus do dia
            let tooltipText = 'Bonus adicionado a esse dia:<br>';
            bonus.items.forEach(item => {
                tooltipText += `+${item.value} → ${item.name}<br>`;
            });
            
            html += `<td style="${valueStyle}">
                <div class="bonus-cell-wrapper">
                    ${bonusDisplay}
                    <span class="bonus-tooltip">${tooltipText}</span>
                </div>
            </td>`;
        } else {
            html += `<td style="${valueStyle}">${bonusDisplay}</td>`;
        }
    }
    html += '</tr>';

    // === LINHAS DE SAQUE ===
    html += '<tr style="height: 40px;">';
    html += '<td class="row-header" style="background: #F2F2F2; border: none; height: 40px;"></td>';
    for (let day = 1; day <= daysInMonth; day++) {
        const hasSaque = saquePerDay[day];
        const saqueText = hasSaque ? 'Saque' : '';
        const saqueStyle = hasSaque 
            ? 'background: #C00000; color: white; border: 3px solid #000000; border-bottom: none; height: 40px; text-align: center; font-weight: bold; font-size: 10px;'
            : 'background: #F2F2F2; border: none; height: 40px; text-align: center; font-weight: bold; font-size: 10px;';
        html += `<td style="${saqueStyle}">${saqueText}</td>`;
    }
    html += '</tr>';
    
    html += '<tr style="height: 40px;">';
    html += '<td class="row-header" style="background: #F2F2F2; border: none; height: 40px;"></td>';
    for (let day = 1; day <= daysInMonth; day++) {
        const saque = saquePerDay[day];
        const saqueDisplay = saque ? `${saque.total}` : '';
        const valueStyle = saque
            ? 'background: #F2F2F2; border: 3px solid #000000; border-top: none; height: 40px; text-align: center; font-weight: bold; color: #C00000; cursor: pointer;'
            : 'background: #F2F2F2; border: none; height: 40px; text-align: center; font-weight: bold; color: #C00000;';
        
        if (saque) {
            let tooltipText = 'Saques realizados neste dia:<br>';
            saque.items.forEach(item => {
                tooltipText += `-${item.value} → ${item.name}<br>`;
            });
            
            html += `<td style="${valueStyle}">
                <div class="bonus-cell-wrapper">
                    ${saqueDisplay}
                    <span class="bonus-tooltip">${tooltipText}</span>
                </div>
            </td>`;
        } else {
            html += `<td style="${valueStyle}">${saqueDisplay}</td>`;
        }
    }
    html += '</tr>';

    html += '</tbody></table>';
    document.getElementById('tableContainer').innerHTML = html;
}

function editCell(monthKey, dayKey, activityId, cell) {
    const input = cell.querySelector('input');
    if (input) {
        input.focus();
        input.select();
    }
}

function updateCell(monthKey, dayKey, activityId, value) {
    console.log(`📝 updateCell() chamada - Atividade: ${activityId}, Valor: ${value}`);
    
    if (!data[monthKey]) data[monthKey] = {};
    if (!data[monthKey][dayKey]) data[monthKey][dayKey] = {};
    
    data[monthKey][dayKey][activityId] = value ? parseInt(value) : '';
    calculateDayTotal(monthKey, dayKey);
    
    console.log('💾 Chamando saveData() com debounce...');
    saveData(); // Chama com debounce (immediate = false por padrão)
}

function validateMultipleOf3(monthKey, dayKey, activityId, input, maxValue = 90) {
    let value = parseInt(input.value);
    
    // Se o campo estiver vazio, permitir
    if (!input.value || input.value === '') {
        updateCell(monthKey, dayKey, activityId, '');
        return;
    }
    
    // Validar se é um número
    if (isNaN(value)) {
        alert('⚠️ Por favor, digite um número válido!');
        input.value = '';
        return;
    }
    
    // Validar mínimo e máximo
    if (value < 0) {
        alert('⚠️ O valor mínimo é 0!');
        input.value = '';
        return;
    }
    
    if (value > maxValue) {
        alert(`⚠️ O valor máximo é ${maxValue}!`);
        input.value = maxValue;
        value = maxValue;
    }
    
    // Validar se é múltiplo de 3
    if (value % 3 !== 0) {
        // Arredondar para o múltiplo de 3 mais próximo
        const roundedValue = Math.round(value / 3) * 3;
        alert(`⚠️ O valor deve ser múltiplo de 3. Ajustando para ${roundedValue}.`);
        input.value = roundedValue;
        value = roundedValue;
    }
    
    // Garantir que o valor final está dentro dos limites
    if (value > maxValue) value = maxValue;
    if (value < 0) value = 0;
    
    input.value = value;
    updateCell(monthKey, dayKey, activityId, value);
}

function calculateDayTotal(monthKey, dayKey) {
    if (!data[monthKey] || !data[monthKey][dayKey]) return;
    
    let total = 0;
    activities.forEach(activity => {
        const value = data[monthKey][dayKey][activity.id];
        if (value && !isNaN(value)) {
            total += parseInt(value);
        }
    });
    
    const bonus = data[monthKey][dayKey].bonus;
    if (bonus && !isNaN(bonus)) {
        total += parseInt(bonus);
    }
    
    data[monthKey][dayKey].pontos = total;
    generateTable();
}

function editBonus(monthKey, dayKey) {
    const bonus = prompt('Digite o valor do bônus:', data[monthKey]?.[dayKey]?.bonus || '');
    const bonusLabel = prompt('Digite a descrição do bônus (ex: Gift Card, Quebra Bing):', 
                                data[monthKey]?.[dayKey]?.bonusLabel || '');
    
    if (bonus !== null) {
        if (!data[monthKey]) data[monthKey] = {};
        if (!data[monthKey][dayKey]) data[monthKey][dayKey] = {};
        
        data[monthKey][dayKey].bonus = bonus ? parseInt(bonus) : '';
        data[monthKey][dayKey].bonusLabel = bonusLabel || '';
        calculateDayTotal(monthKey, dayKey);
        saveData();
    }
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    updateMonthDisplay();
    generateTable();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    updateMonthDisplay();
    generateTable();
}

// Funções para gerenciar pontuações extras
function openAddBonusModal() {
    document.getElementById('addBonusModal').style.display = 'block';
    // Limpar campos
    document.getElementById('bonusTitle').value = '';
    document.getElementById('bonusPoints').value = '';
    document.getElementById('bonusDate').value = '';
}

function closeAddBonusModal() {
    document.getElementById('addBonusModal').style.display = 'none';
}

function addExtraBonus() {
    const title = document.getElementById('bonusTitle').value.trim();
    const points = parseInt(document.getElementById('bonusPoints').value);
    const day = parseInt(document.getElementById('bonusDate').value);
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    // Validações
    if (!title) {
        alert('Por favor, insira um título para a pontuação.');
        return;
    }
    if (!points || points <= 0) {
        alert('Por favor, insira uma quantidade válida de pontos.');
        return;
    }
    if (!day || day < 1 || day > daysInMonth) {
        alert(`Por favor, insira um dia válido entre 1 e ${daysInMonth}.`);
        return;
    }

    // Adicionar ao data com estrutura de bônus extras
    const monthKey = `${currentYear}-${currentMonth}`;
    if (!data[monthKey]) {
        data[monthKey] = {};
    }
    
    // Inicializar estrutura de bônus extras se não existir
    if (!data[monthKey].extraBonuses) {
        data[monthKey].extraBonuses = {};
    }
    
    const dayKey = `day${day}`;
    if (!data[monthKey].extraBonuses[dayKey]) {
        data[monthKey].extraBonuses[dayKey] = [];
    }
    
    // Adicionar o bônus extra
    data[monthKey].extraBonuses[dayKey].push({
        title: title,
        points: points
    });

    // Salvar e regenerar tabela
    saveData();
    generateTable();
    closeAddBonusModal();
    
    alert(`✅ Pontuação "${title}" de ${points} pontos adicionada ao dia ${day}!`);
}

// Funções para gerenciar saques
function openSaqueModal() {
    document.getElementById('saqueModal').style.display = 'block';
    document.getElementById('saqueTitle').value = '';
    document.getElementById('saquePoints').value = '';
    document.getElementById('saqueDate').value = '';
}

function closeSaqueModal() {
    document.getElementById('saqueModal').style.display = 'none';
}

function addSaque() {
    const title = document.getElementById('saqueTitle').value.trim();
    const points = parseInt(document.getElementById('saquePoints').value);
    const day = parseInt(document.getElementById('saqueDate').value);
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    if (!title) {
        alert('Por favor, insira um título para o saque.');
        return;
    }
    if (!points || points <= 0) {
        alert('Por favor, insira uma quantidade válida de pontos.');
        return;
    }
    if (!day || day < 1 || day > daysInMonth) {
        alert(`Por favor, insira um dia válido entre 1 e ${daysInMonth}.`);
        return;
    }

    const monthKey = `${currentYear}-${currentMonth}`;
    if (!data[monthKey]) {
        data[monthKey] = {};
    }
    
    if (!data[monthKey].saques) {
        data[monthKey].saques = {};
    }
    
    const dayKey = `day${day}`;
    if (!data[monthKey].saques[dayKey]) {
        data[monthKey].saques[dayKey] = [];
    }
    
    data[monthKey].saques[dayKey].push({
        title: title,
        points: points
    });

    saveData();
    generateTable();
    closeSaqueModal();
    
    alert(`✅ Saque "${title}" de ${points} pontos registrado no dia ${day}!`);
}

// Fechar modal ao clicar fora dele
window.onclick = function(event) {
    const modalBonus = document.getElementById('addBonusModal');
    const modalSaque = document.getElementById('saqueModal');
    if (event.target == modalBonus) {
        closeAddBonusModal();
    }
    if (event.target == modalSaque) {
        closeSaqueModal();
    }
}

async function saveData(immediate = false) {
    console.log(`🔄 saveData() chamada - immediate=${immediate}`);
    
    // Salvar no localStorage imediatamente (sempre) - segregado por usuário
    if (currentUserId) {
        saveToLocalStorage(currentUserId, data);
    } else {
        console.warn('⚠️ Nenhum usuário logado, não salvando no localStorage');
    }
    hasUnsavedChanges = true;
    
    // Se não for salvamento imediato, aplicar debounce de 30 segundos
    if (!immediate) {
        // Limpar timeout anterior se existir
        if (saveTimeout) {
            clearTimeout(saveTimeout);
            console.log('⏳ Timer de salvamento CANCELADO e REINICIADO (30 segundos)');
        } else {
            console.log('⏱️ Timer de salvamento INICIADO (30 segundos)');
        }
        
        // Criar novo timeout de 30 segundos
        saveTimeout = setTimeout(() => {
            console.log('⏰ 30 segundos de inatividade detectados - salvando no Supabase...');
            saveToSupabase();
        }, 30000); // 30 segundos
        
        console.log('✅ Timer agendado. Aguardando 30 segundos sem edições...');
        return; // Não salvar no Supabase ainda
    }
    
    // Se for imediato, salvar agora
    console.log('💾 Salvamento IMEDIATO solicitado');
    
    // Cancelar qualquer timer pendente
    if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
        console.log('🚫 Timer pendente cancelado');
    }
    
    await saveToSupabase();
}

// Função separada que realmente salva no Supabase
async function saveToSupabase() {
    try {
        // Obter sessão do usuário
        const { data: sessionData } = await supabaseClient.auth.getSession();
        
        if (!sessionData?.session) {
            console.warn('Usuário não autenticado. Salvando apenas no localStorage.');
            hasUnsavedChanges = false;
            return;
        }
        
        const userId = sessionData.session.user.id;
        
        // Preparar dados para salvar no Supabase
        const monthKey = `${currentYear}-${currentMonth}`;
        const monthData = data[monthKey] || {};
        
        // Converter mês de 0-11 para 1-12 para o banco de dados
        const monthForDB = currentMonth + 1;
        
        console.log(`💾 Salvando dados: Usuário=${userId}, Ano=${currentYear}, Mês=${monthForDB}`);
        console.log(`📊 Dados do mês (${monthKey}):`, monthData);
        
        // Verificar se já existe um registro para este usuário/ano/mês
        const { data: existingDataResult, error: selectError } = await supabaseClient
            .from('user_data')
            .select('*')
            .eq('uuid', userId)
            .eq('year', currentYear)
            .eq('month', monthForDB)
            .maybeSingle();
        
        if (selectError) {
            console.error('Erro ao verificar dados existentes:', selectError);
            throw selectError;
        }
        
        // Capturar info do dispositivo atual (cliente)
        const deviceInfo = getDeviceInfo();

        const dataToSave = {
            uuid: userId,
            year: currentYear,
            month: monthForDB, // Mês de 1 a 12
            json: monthData,
            device_info: deviceInfo,
            created_at: new Date().toISOString()
        };
        
        if (existingDataResult) {
            // Atualizar registro existente
            console.log('📝 Atualizando registro existente...');
            const { data: updateResult, error: updateError } = await supabaseClient
                .from('user_data')
                .update({
                    json: monthData,
                    device_info: deviceInfo,
                    created_at: new Date().toISOString()
                })
                .eq('uuid', userId)
                .eq('year', currentYear)
                .eq('month', monthForDB)
                .select();
            
            if (updateError) {
                console.error('Erro ao atualizar dados no Supabase:', updateError);
                throw updateError;
            }
            
            console.log('✅ Dados atualizados com sucesso!', updateResult);
        } else {
            // Inserir novo registro
            console.log('➕ Inserindo novo registro...');
            const { data: insertResult, error: insertError } = await supabaseClient
                .from('user_data')
                .insert([dataToSave])
                .select();
            
            if (insertError) {
                console.error('Erro ao inserir dados no Supabase:', insertError);
                throw insertError;
            }
            
            console.log('✅ Novo registro criado com sucesso!', insertResult);
        }
        
        console.log('✅ Dados salvos com sucesso no Supabase!');
        hasUnsavedChanges = false;
        updateLastSaveTime();
        
    } catch (error) {
        console.error('❌ Erro ao salvar no Supabase:', error);
        alert('⚠️ Erro ao salvar dados online. Os dados foram salvos localmente.');
    }
}

// Função para atualizar o horário do último salvamento baseado no Supabase
async function updateLastSaveTime() {
    try {
        const { data: sessionData } = await supabaseClient.auth.getSession();
        
        if (!sessionData?.session) {
            return;
        }
        
        const userId = sessionData.session.user.id;
        
        // Buscar o registro mais recente do usuário no Supabase (incluindo device_info se existir)
        const { data: latestRecord, error } = await supabaseClient
            .from('user_data')
            .select('created_at, device_info')
            .eq('uuid', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
        
        if (error || !latestRecord) {
            console.log('Nenhum registro de save encontrado no Supabase');
            return;
        }
        
        // Converter o timestamp do Supabase para horário local
        const saveDate = new Date(latestRecord.created_at);
        const day = String(saveDate.getDate()).padStart(2, '0');
        const month = String(saveDate.getMonth() + 1).padStart(2, '0');
        const year = saveDate.getFullYear();
        const hours = String(saveDate.getHours()).padStart(2, '0');
        const minutes = String(saveDate.getMinutes()).padStart(2, '0');
        const dateTimeString = `Último save: ${day}/${month}/${year} ${hours}:${minutes}`;
        
        const lastSaveElement = document.getElementById('lastSaveTime');
        if (lastSaveElement) {
            lastSaveElement.textContent = dateTimeString;
        }
        
        // Exibir nome do dispositivo (se disponível) ao lado
        const deviceEl = document.getElementById('lastSaveDevice');
        if (deviceEl) {
            const device = latestRecord?.device_info || getDeviceInfo();
            deviceEl.textContent = device;
        }
    } catch (error) {
        console.error('Erro ao buscar último save:', error);
    }
}

// Função para salvar imediatamente (chamada pelo botão)
async function saveDataImmediately() {
    if (!hasUnsavedChanges) {
        console.log('ℹ️ Nenhuma alteração para salvar');
        alert('✅ Não há alterações para salvar!');
        return;
    }
    
    console.log('🚀 Salvamento manual iniciado...');
    await saveData(true);
    alert('✅ Dados salvos com sucesso!');
}

async function loadData() {
    try {
        // Obter sessão do usuário
        const { data: sessionData } = await supabaseClient.auth.getSession();
        
        if (!sessionData?.session) {
            console.warn('⚠️ Usuário não autenticado. Não é possível carregar dados.');
            return;
        }
        
        const userId = sessionData.session.user.id;
        console.log(`📥 Carregando dados para usuário: ${userId.substring(0, 8)}...`);
        
        // Buscar todos os dados do usuário no Supabase
        const { data: userDataResult, error } = await supabaseClient
            .from('user_data')
            .select('*')
            .eq('uuid', userId);
        
        if (error) {
            console.error('Erro ao carregar dados do Supabase:', error);
            throw error;
        }
        
        if (userDataResult && userDataResult.length > 0) {
            // Reconstruir o objeto data a partir dos registros do Supabase
            data = {};
            userDataResult.forEach(record => {
                // Converter mês de 1-12 (banco de dados) para 0-11 (JavaScript)
                const monthForJS = record.month - 1;
                const monthKey = `${record.year}-${monthForJS}`;
                data[monthKey] = record.json;
            });
            
            // Salvar no localStorage como backup (segregado por usuário)
            saveToLocalStorage(userId, data);
            
            console.log('✅ Dados carregados do Supabase!');
        } else {
            // Nenhum dado no Supabase, tentar carregar do localStorage deste usuário
            console.log('❓ Nenhum dado encontrado no Supabase. Tentando localStorage...');
            const localData = loadFromLocalStorage(userId);
            if (localData) {
                data = localData;
                console.log('✅ Dados carregados do localStorage do usuário.');
            } else {
                console.log('ℹ️ Nenhum dado encontrado. Iniciando com dados vazios.');
                data = {};
            }
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        
        // Fallback para localStorage do usuário atual
        if (currentUserId) {
            const localData = loadFromLocalStorage(currentUserId);
            if (localData) {
                data = localData;
                console.log('✅ Fallback: dados carregados do localStorage do usuário.');
            } else {
                console.log('ℹ️ Fallback: Iniciando com dados vazios.');
                data = {};
            }
        } else {
            console.warn('⚠️ Não foi possível carregar dados: usuário não identificado.');
            data = {};
        }
    }
}

function clearMonth() {
    if (confirm('Tem certeza que deseja limpar todos os dados deste mês?')) {
        const monthKey = `${currentYear}-${currentMonth}`;
        data[monthKey] = {};
        generateTable();
        saveData();
    }
}

function exportData() {
    // Exporta o JSON dos dados atuais do usuário
    const jsonData = JSON.stringify(data, null, 2); // Formatado com indentação
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().slice(0, 10);
    const userIdShort = currentUserId ? currentUserId.substring(0, 8) : 'unknown';
    a.download = `MS_Rewards_Export_${userIdShort}_${timestamp}.json`;
    a.click();
    console.log('📤 Dados exportados com sucesso!');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) {
        return;
    }

    // Verificar se é um arquivo JSON
    if (!file.name.endsWith('.json')) {
        alert('⚠️ Por favor, selecione um arquivo JSON válido!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // Validar se o JSON tem a estrutura esperada
            if (typeof importedData !== 'object' || importedData === null) {
                throw new Error('Estrutura de dados inválida');
            }

            // Substituir dados atuais
            data = importedData;
            
            // Salvar no localStorage segregado e atualizar a tabela
            if (currentUserId) {
                saveToLocalStorage(currentUserId, data);
            }
            generateTable();
            
            alert('✅ Dados importados com sucesso!');
            console.log('📥 Dados importados com sucesso!');
        } catch (error) {
            alert('❌ Erro ao importar arquivo: ' + error.message + '\n\nVerifique se o arquivo é um JSON válido exportado desta aplicação.');
            console.error('❌ Erro ao importar:', error);
        }
    };

    reader.onerror = function() {
        alert('❌ Erro ao ler o arquivo. Por favor, tente novamente.');
    };

    reader.readAsText(file);
    
    // Limpar o input para permitir importar o mesmo arquivo novamente
    event.target.value = '';
}

// REMOVIDO: Auto-save a cada 30 segundos (substituído por debounce)
// Agora o salvamento é feito:
// 1. Automaticamente após 30 segundos de inatividade (debounce)
// 2. Manualmente ao clicar no botão "Salvar"