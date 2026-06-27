async function medirTempo(nome, fn) {
    const inicio = performance.now();
    const resultado = await fn();
    const fim = performance.now();
    return { nome, tempo: parseFloat((fim - inicio).toFixed(2)), resultado };
}

async function correrTestes() {
    const resultados = [];

    // Teste 1: Resposta IPC (ping ao backend)
    const inicio = performance.now();
    window.electronAPI.sendToBackend('ping');
    await new Promise(resolve => setTimeout(resolve, 100));
    const fim = performance.now();
    resultados.push({ 
        Teste: 'Resposta IPC (ping)', 
        'Tempo (ms)': parseFloat((fim - inicio).toFixed(2)), 
        Notas: 'Tempo de envio e resposta do backend' 
    });

    // Teste 2: Leitura de pasta com 10 ficheiros
    const r2 = await medirTempo('Leitura de pasta', () =>
        window.electronAPI.readFolder('C:/Users/tomas/Desktop/Músicas mp3')
    );
    resultados.push({ Teste: r2.nome, 'Tempo (ms)': r2.tempo, Notas: `${r2.resultado.length} ficheiros encontrados` });

    // Teste 3: Tempo de renderização do DOM
    const r4 = await medirTempo('Renderização do DOM', () =>
        new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => resolve('ok'));
            });
        })
    );
    resultados.push({ Teste: r4.nome, 'Tempo (ms)': r4.tempo, Notas: 'Dois frames renderizados' });

    console.table(resultados);
}