/**
 * ============================================================
 *  JOGO DA DAMA DAS OPERAÇÕES - Script Principal
 *  Versão com opção de negativos, tabuleiro configurável,
 *  operações únicas e overlay de vitória.
 * ============================================================
 */

// ========================= CONFIGURAÇÕES GLOBAIS =========================
let totalCasas = 64;
let tabuleiro = [];
let jogadorAtual = 1;
let pontuacao = [0, 0];
let nomeJogadores = ['', ''];
let tempoLimite = 25;
let jogoAtivo = false;
let timerId = null;
let tempoRestante = 25;
let casaSelecionada = null;

// ========================= REFERÊNCIAS DOM =========================
const DOM = {
    tabuleiro: document.getElementById('tabuleiro'),
    turno: document.getElementById('turno'),
    timer: document.getElementById('timer'),
    modal: document.getElementById('modal'),
    pergunta: document.getElementById('pergunta'),
    resposta: document.getElementById('resposta'),
    btnResponder: document.getElementById('btn-responder'),
    feedback: document.getElementById('feedback'),
    configuracao: document.getElementById('configuracao'),
    jogo: document.getElementById('jogo'),
    mensagemFinal: document.getElementById('mensagem-final'),
    vencedor: document.getElementById('vencedor'),
    placarFinal: document.getElementById('placar-final'),
    btnIniciar: document.getElementById('btn-iniciar'),
    btnReiniciar: document.getElementById('btn-reiniciar'),
    btnTrocar: document.getElementById('btn-trocar-jogadores'),
    btnEncerrar: document.getElementById('btn-encerrar'),
    erroNomes: document.getElementById('erro-nomes'),
    nome1: document.getElementById('nome1'),
    nome2: document.getElementById('nome2'),
    tempoInput: document.getElementById('tempoLimite'),
    minNum: document.getElementById('minNum'),
    maxNum: document.getElementById('maxNum'),
    opSoma: document.getElementById('opSoma'),
    opSub: document.getElementById('opSub'),
    opMult: document.getElementById('opMult'),
    opDiv: document.getElementById('opDiv'),
    tamanhoTabuleiro: document.getElementById('tamanhoTabuleiro'),
    permiteNegativos: document.getElementById('permiteNegativos'),
    pontosJ1: document.querySelector('.pontos-j1'),
    pontosJ2: document.querySelector('.pontos-j2'),
    nomeJ1: document.querySelector('.nome-j1'),
    nomeJ2: document.querySelector('.nome-j2'),
};

// ========================= FUNÇÕES AUXILIARES =========================

function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pontosParaVitoria() {
    return Math.ceil(totalCasas * 0.51);
}

/** Gera uma operação respeitando intervalo, operações e restrição de negativos */
function gerarOperacao() {
    const min = parseInt(DOM.minNum.value) || 0;
    const max = parseInt(DOM.maxNum.value) || 10;
    const permiteNegativos = DOM.permiteNegativos.checked;

    const ops = [];
    if (DOM.opSoma.checked) ops.push('+');
    if (DOM.opSub.checked) ops.push('-');
    if (DOM.opMult.checked) ops.push('×');
    if (DOM.opDiv.checked) ops.push('÷');
    if (ops.length === 0) ops.push('+');

    const tipo = ops[randInt(0, ops.length - 1)];
    let a, b, resultado, texto;
    let tentativas = 0;
    const maxTentativas = 200;

    do {
        a = randInt(min, max);
        b = randInt(min, max);
        tentativas++;

        if (permiteNegativos) break;

        // Garantir resultado não negativo para cada operação
        switch (tipo) {
            case '+':
                // a+b sempre >=0 se ambos >=0 (já que min>=0)
                break;
            case '-':
                if (a < b) { const temp = a; a = b; b = temp; }
                break;
            case '×':
                if (a < 0 || b < 0) {
                    a = Math.abs(a);
                    b = Math.abs(b);
                }
                break;
            case '÷':
                a = Math.abs(a);
                b = Math.abs(b);
                if (b === 0) b = 1;
                const minQuoc = Math.ceil(min / b);
                const maxQuoc = Math.floor(max / b);
                if (minQuoc > maxQuoc) {
                    const quoc = randInt(0, Math.min(max, 10));
                    a = b * quoc;
                } else {
                    const quoc = randInt(minQuoc, maxQuoc);
                    a = b * quoc;
                }
                break;
        }
    } while (tentativas < maxTentativas);

    // Calcula e monta texto
    switch (tipo) {
        case '+':
            resultado = a + b;
            texto = `${a} + ${b < 0 ? `(${b})` : b}`;
            break;
        case '-':
            resultado = a - b;
            texto = `${a} - ${b < 0 ? `(${b})` : b}`;
            break;
        case '×':
            resultado = a * b;
            texto = `${a} × ${b < 0 ? `(${b})` : b}`;
            break;
        case '÷':
            while (b === 0) b = randInt(1, max);
            const minQ = Math.ceil(min / b);
            const maxQ = Math.floor(max / b);
            if (minQ > maxQ) {
                const q = randInt(0, Math.min(max, 10));
                a = b * q;
                resultado = q;
            } else {
                const q = randInt(minQ, maxQ);
                a = b * q;
                resultado = q;
            }
            texto = `${a} ÷ ${b < 0 ? `(${b})` : b}`;
            break;
    }
    return { texto, resultado };
}

/** Gera um conjunto de operações únicas (evita repetições) */
function gerarOperacoesUnicas(quantidade) {
    const operacoes = [];
    const usedTexts = new Set();
    let tentativas = 0;
    const maxTentativas = 1000;

    while (operacoes.length < quantidade && tentativas < maxTentativas) {
        const op = gerarOperacao();
        const chave = op.texto + '|' + op.resultado;
        if (!usedTexts.has(chave)) {
            usedTexts.add(chave);
            operacoes.push(op);
        }
        tentativas++;
    }
    while (operacoes.length < quantidade) {
        operacoes.push(gerarOperacao());
    }
    return operacoes;
}

function obterNomesValidos() {
    const n1 = DOM.nome1.value.trim();
    const n2 = DOM.nome2.value.trim();
    if (!n1 || !n2) {
        DOM.erroNomes.textContent = '⚠️ Preencha o nome de ambos os jogadores!';
        return null;
    }
    if (n1 === n2) {
        DOM.erroNomes.textContent = '⚠️ Os nomes devem ser diferentes!';
        return null;
    }
    DOM.erroNomes.textContent = '';
    return [n1, n2];
}

function lerTempoConfigurado() {
    let valor = parseInt(DOM.tempoInput.value);
    if (isNaN(valor) || valor < 5) valor = 5;
    if (valor > 60) valor = 60;
    DOM.tempoInput.value = valor;
    return valor;
}

// ========================= FUNÇÕES DO JOGO =========================

function criarTabuleiro() {
    const operacoes = gerarOperacoesUnicas(totalCasas);
    tabuleiro = [];
    for (let i = 0; i < totalCasas; i++) {
        tabuleiro.push({
            operacao: operacoes[i],
            revelada: false,
            dono: 0,
        });
    }
}

function renderizarTabuleiro() {
    DOM.tabuleiro.innerHTML = '';
    const tamanho = Math.sqrt(totalCasas);
    DOM.tabuleiro.style.gridTemplateColumns = `repeat(${tamanho}, 1fr)`;

    for (let i = 0; i < tabuleiro.length; i++) {
        const casa = tabuleiro[i];
        const div = document.createElement('div');
        div.className = 'casa';

        const linha = Math.floor(i / tamanho);
        const coluna = i % tamanho;
        if ((linha + coluna) % 2 === 1) div.classList.add('escura');

        if (casa.revelada && casa.dono !== 0) {
            div.classList.add(`revelada-j${casa.dono}`);
            div.textContent = casa.operacao.texto;
        } else {
            div.textContent = '?';
        }

        div.addEventListener('click', () => casaClicada(i));
        DOM.tabuleiro.appendChild(div);
    }
    atualizarPlacar();
    atualizarTurno();
}

function atualizarTurno() {
    const nome = nomeJogadores[jogadorAtual - 1] || `Jogador ${jogadorAtual}`;
    DOM.turno.textContent = `Vez de ${nome}`;
    DOM.turno.style.background = jogadorAtual === 1 ? '#3498db' : '#e74c3c';
    DOM.turno.style.color = 'white';
}

function atualizarPlacar() {
    const n1 = nomeJogadores[0] || 'Jogador 1';
    const n2 = nomeJogadores[1] || 'Jogador 2';
    DOM.nomeJ1.textContent = n1;
    DOM.nomeJ2.textContent = n2;
    DOM.pontosJ1.textContent = pontuacao[0];
    DOM.pontosJ2.textContent = pontuacao[1];
}

function casaClicada(indice) {
    if (!jogoAtivo) return;
    const casa = tabuleiro[indice];
    if (casa.revelada || timerId !== null) return;

    casaSelecionada = indice;
    const op = casa.operacao;
    DOM.pergunta.textContent = `${op.texto} = ?`;
    DOM.resposta.value = '';
    DOM.feedback.textContent = '';
    DOM.modal.classList.remove('hidden');
    DOM.resposta.focus();

    tempoRestante = tempoLimite;
    DOM.timer.textContent = `⏱️ ${tempoRestante}s`;
    clearInterval(timerId);
    timerId = setInterval(() => {
        tempoRestante--;
        DOM.timer.textContent = `⏱️ ${tempoRestante}s`;
        if (tempoRestante <= 0) {
            clearInterval(timerId);
            timerId = null;
            DOM.feedback.textContent = '⏰ Tempo esgotado!';
            DOM.feedback.style.color = 'red';
            setTimeout(() => {
                DOM.modal.classList.add('hidden');
                tratarResposta(false);
            }, 1000);
        }
    }, 1000);
}

function tratarResposta(acertou) {
    if (!jogoAtivo) return;
    const casa = tabuleiro[casaSelecionada];
    if (casa.revelada) return;

    if (acertou) {
        casa.revelada = true;
        casa.dono = jogadorAtual;
        pontuacao[jogadorAtual - 1]++;
        DOM.feedback.textContent = '✅ Correto! +1 ponto';
        DOM.feedback.style.color = 'green';
    } else {
        casa.operacao = gerarOperacao();
        DOM.feedback.textContent = '❌ Errado! A operação foi trocada.';
        DOM.feedback.style.color = 'red';
    }

    clearInterval(timerId);
    timerId = null;
    DOM.timer.textContent = `⏱️ ${tempoLimite}s`;

    // Aguarda 2 segundos para o jogador ver o feedback
    setTimeout(() => {
        DOM.modal.classList.add('hidden');

        if (acertou) {
            renderizarTabuleiro();
        }

        if (jogoAtivo) {
            if (pontuacao[jogadorAtual - 1] >= pontosParaVitoria()) {
                encerrarJogo();
                return;
            }
        }

        if (jogoAtivo) {
            jogadorAtual = jogadorAtual === 1 ? 2 : 1;
            atualizarTurno();
            atualizarPlacar();
            if (!acertou) {
                renderizarTabuleiro();
            }
            verificarFimDeJogo();
        }
    }, 2000);
}

function verificarFimDeJogo() {
    if (tabuleiro.every(casa => casa.revelada)) {
        encerrarJogo();
    }
}

function encerrarJogo() {
    if (!jogoAtivo && !DOM.mensagemFinal.classList.contains('hidden')) return;
    jogoAtivo = false;
    clearInterval(timerId);
    timerId = null;
    DOM.modal.classList.add('hidden');

    const n1 = nomeJogadores[0] || 'Jogador 1';
    const n2 = nomeJogadores[1] || 'Jogador 2';
    let nomeVencedor = '';
    let mensagem = '';
    if (pontuacao[0] > pontuacao[1]) {
        nomeVencedor = n1;
        mensagem = `🏆 ${n1} venceu!`;
    } else if (pontuacao[1] > pontuacao[0]) {
        nomeVencedor = n2;
        mensagem = `🏆 ${n2} venceu!`;
    } else {
        mensagem = '🤝 Empate!';
    }

    if (nomeVencedor) {
        document.getElementById('vitoria-nome').textContent = nomeVencedor;
        document.getElementById('overlay-vitoria').classList.remove('hidden');

        setTimeout(() => {
            document.getElementById('overlay-vitoria').classList.add('hidden');
            DOM.vencedor.textContent = mensagem;
            DOM.placarFinal.textContent = `Placar final: ${n1} ${pontuacao[0]} × ${pontuacao[1]} ${n2}`;
            DOM.mensagemFinal.classList.remove('hidden');
        }, 5000);
    } else {
        DOM.vencedor.textContent = mensagem;
        DOM.placarFinal.textContent = `Placar final: ${n1} ${pontuacao[0]} × ${pontuacao[1]} ${n2}`;
        DOM.mensagemFinal.classList.remove('hidden');
    }
}

// ========================= INICIALIZAÇÃO E CONTROLES =========================

function iniciarJogo() {
    const nomes = obterNomesValidos();
    if (!nomes) return;

    const novoTempo = lerTempoConfigurado();
    tempoLimite = novoTempo;

    let tamanho = parseInt(DOM.tamanhoTabuleiro.value);
    if (isNaN(tamanho) || tamanho < 3) tamanho = 3;
    if (tamanho > 10) tamanho = 10;
    DOM.tamanhoTabuleiro.value = tamanho;
    totalCasas = tamanho * tamanho;

    if (!DOM.opSoma.checked && !DOM.opSub.checked && !DOM.opMult.checked && !DOM.opDiv.checked) {
        DOM.erroNomes.textContent = '⚠️ Selecione pelo menos uma operação!';
        return;
    }

    nomeJogadores = nomes;
    jogoAtivo = true;
    jogadorAtual = 1;
    pontuacao = [0, 0];

    DOM.mensagemFinal.classList.add('hidden');
    DOM.configuracao.classList.add('hidden');
    DOM.jogo.classList.remove('hidden');
    DOM.timer.textContent = `⏱️ ${tempoLimite}s`;

    criarTabuleiro();
    renderizarTabuleiro();
    atualizarTurno();
    atualizarPlacar();
}

function reiniciarPartida() {
    if (!nomeJogadores[0] || !nomeJogadores[1]) {
        DOM.configuracao.classList.remove('hidden');
        DOM.jogo.classList.add('hidden');
        return;
    }
    DOM.mensagemFinal.classList.add('hidden');
    jogoAtivo = true;
    jogadorAtual = 1;
    pontuacao = [0, 0];
    DOM.timer.textContent = `⏱️ ${tempoLimite}s`;
    clearInterval(timerId);
    timerId = null;
    DOM.modal.classList.add('hidden');
    criarTabuleiro();
    renderizarTabuleiro();
    atualizarTurno();
    atualizarPlacar();
}

function trocarJogadores() {
    DOM.configuracao.classList.remove('hidden');
    DOM.jogo.classList.add('hidden');
    DOM.mensagemFinal.classList.add('hidden');
    jogoAtivo = false;
    clearInterval(timerId);
    timerId = null;
    DOM.modal.classList.add('hidden');
    DOM.nome1.value = nomeJogadores[0] || '';
    DOM.nome2.value = nomeJogadores[1] || '';
}

// ========================= EVENTOS =========================

DOM.btnIniciar.addEventListener('click', iniciarJogo);
DOM.btnReiniciar.addEventListener('click', reiniciarPartida);
DOM.btnTrocar.addEventListener('click', trocarJogadores);
DOM.btnEncerrar.addEventListener('click', encerrarJogo);

DOM.btnResponder.addEventListener('click', () => {
    if (!jogoAtivo || casaSelecionada === null) return;
    const casa = tabuleiro[casaSelecionada];
    if (casa.revelada) return;

    const resposta = parseInt(DOM.resposta.value);
    if (isNaN(resposta)) {
        DOM.feedback.textContent = 'Digite um número inteiro!';
        DOM.feedback.style.color = 'orange';
        return;
    }

    const acertou = (resposta === casa.operacao.resultado);
    clearInterval(timerId);
    timerId = null;
    tratarResposta(acertou);
});

DOM.resposta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') DOM.btnResponder.click();
});

// ========================= INICIALIZAÇÃO =========================
DOM.configuracao.classList.remove('hidden');
DOM.jogo.classList.add('hidden');
DOM.mensagemFinal.classList.add('hidden');
DOM.timer.textContent = `⏱️ ${tempoLimite}s`;