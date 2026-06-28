# Traxxer

Traxxer é uma aplicação desktop de DJing desenvolvida com Electron.js, HTML, CSS e JavaScript no frontend, e C++ com JUCE no backend. Permite reproduzir e misturar duas faixas de áudio em simultâneo, com suporte a jog wheel, scratch, deteção automática de BPM e tonalidade, e controlo de pitch em tempo real.

---

## Tecnologias

### Frontend
- **Electron.js** — framework para aplicações desktop com tecnologias web
- **HTML / CSS / JavaScript** — interface da aplicação
- **WaveSurfer.js** — geração e visualização de waveforms
- **jsmediatags** — leitura de metadados de ficheiros de áudio (título, artista, capa, BPM)
- **essentia.js** — deteção automática de BPM por análise de áudio
- **SoundTouchJS** — controlo de pitch e tempo em tempo real
- **Bootstrap** — estilos base

### Backend
- **C++ com JUCE** — motor de áudio em tempo real (`TraxxerBackend.exe`)
- **libkeyfinder** — análise de tonalidade musical (`TraxxerKeyAnalyzer.exe`)
- **libsndfile** — leitura de ficheiros de áudio no analisador de tonalidade
- **CMake** — sistema de compilação

### Ambiente de compilação
- **MSYS2** — ambiente de desenvolvimento para Windows (GCC + pacman)

---

## Estrutura do projeto

```
TRAXXER/
├── backend/                         ← Motor de áudio em C++ com JUCE
│   ├── bin/
│   │   ├── TraxxerBackend.exe       ← Executável do motor de áudio
│   │   └── TraxxerKeyAnalyzer.exe   ← Executável do analisador de tonalidade
│   ├── keyanalyzer/                 ← Projeto independente de análise de tonalidade
│   │   ├── CMakeLists.txt           ← Instruções de compilação do analisador
│   │   └── KeyAnalyzer.cpp          ← Lógica de análise com libkeyfinder
│   ├── AudioEngine.cpp / .h         ← Núcleo do motor de áudio
│   ├── CMakeLists.txt               ← Instruções de compilação do backend
│   └── main.cpp                     ← Ponto de entrada, escuta comandos IPC
├── frontend/                        ← Interface da aplicação em HTML/CSS/JS
│   ├── electron/
│   │   ├── main.js                  ← Processo principal, gere janela e backend
│   │   └── preload.js               ← Ponte segura entre frontend e Electron
│   ├── html/
│   │   ├── index.html               ← Página principal da aplicação
│   │   └── partials/                ← Secções da interface (decks, header, library...)
│   ├── js/
│   │   ├── decks/trk1/ e trk2/      ← Lógica de cada deck (BPM, pitch, jog wheel...)
│   │   ├── library/library.js       ← Gestão da biblioteca de músicas
│   │   └── loadPartials.js          ← Carrega os ficheiros HTML parciais
│   │   └── perftests.js             ← Testes do segundo grupo 
│   └── css/                         ← Estilos separados por área da interface
├── package.json                     ← Dependências e scripts do projeto
├── .env                             ← Variáveis de ambiente
└── README.md                        ← Este ficheiro
```

---

## Pré-requisitos

- **Node.js** (v18 ou superior)
- **MSYS2** (Windows) com GCC e pacman
- **CMake** (v3.22 ou superior)

---

## Instalação

### 1. Clonar o repositório

```bash
git clone https://github.com/teu-utilizador/traxxer.git
cd traxxer
```

### 2. Instalar dependências Node.js

```bash
npm install
```

### 3. Instalar dependências C++ via MSYS2

Abre o terminal MSYS2 (UCRT64) e corre:

```bash
pacman -S mingw-w64-ucrt-x86_64-gcc
pacman -S mingw-w64-ucrt-x86_64-cmake
pacman -S mingw-w64-ucrt-x86_64-libsndfile
```

### 4. Compilar a libkeyfinder manualmente

A libkeyfinder não está disponível diretamente via pacman e tem de ser compilada a partir do código fonte:

```bash
git clone https://github.com/mixxxdj/libkeyfinder.git
cd libkeyfinder
mkdir build && cd build
cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=OFF \
  -DCMAKE_C_COMPILER=/ucrt64/bin/gcc.exe \
  -DCMAKE_CXX_COMPILER=/ucrt64/bin/g++.exe \
  -DCMAKE_MAKE_PROGRAM=/ucrt64/bin/mingw32-make.exe
cmake --build . --config Release
cmake --install . --prefix /ucrt64
```

### 5. Compilar o TraxxerBackend

```bash
cd backend
mkdir build && cd build
cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_COMPILER=/ucrt64/bin/gcc.exe \
  -DCMAKE_CXX_COMPILER=/ucrt64/bin/g++.exe \
  -DCMAKE_MAKE_PROGRAM=/ucrt64/bin/mingw32-make.exe
cmake --build . --config Release
```

O executável `TraxxerBackend.exe` será gerado na pasta `build/`. Copia-o para `backend/bin/`.

### 6. Compilar o TraxxerKeyAnalyzer

```bash
cd backend/keyanalyzer
mkdir build && cd build
cmake .. -G "MinGW Makefiles" -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_COMPILER=/ucrt64/bin/gcc.exe \
  -DCMAKE_CXX_COMPILER=/ucrt64/bin/g++.exe \
  -DCMAKE_MAKE_PROGRAM=/ucrt64/bin/mingw32-make.exe
cmake --build . --config Release
cp TraxxerKeyAnalyzer.exe ../../bin/
```

---

## Correr a aplicação

```bash
npm start
```

---

## Funcionalidades

### Implementadas
- Dois decks de reprodução independentes e simétricos
- Carregamento de faixas por drag and drop
- Waveform gerada automaticamente por deck
- Leitura automática de metadados (título, artista, capa, BPM)
- Deteção automática de BPM por análise de áudio (essentia.js)
- Deteção automática de tonalidade (libkeyfinder via IPC)
- Jog wheel com rotação sincronizada à reprodução
- Efeito de scratch em tempo real gerado a partir da música do deck
- Controlo de pitch (SoundTouchJS)
- Botões CUE, Play/Pause, Stop e Ejetar
- Indicadores de tempo decorrido e restante
- Biblioteca de músicas com leitura de pasta
- Janela personalizada sem moldura nativa (3 tamanhos fixos)
- Comunicação IPC entre frontend e backend C++
- Motor de áudio C++ com JUCE em execução contínua

### Planeadas
- Implementação da lógica de áudio do middle deck (crossfader, EQ, faders)
- Crossfader e faders de canal (interface)
- Equalizador de três bandas — HIGH, MID, LOW (interface)
- GAIN e filtro por deck (interface)
- SYNC automático de BPM entre os dois decks
- Loops e Hotcues/Pads
- Efeitos de áudio
- Navegação por pastas na biblioteca
- Interface responsiva para qualquer resolução
- Gravação de sessões

---

## Comunicação IPC

O frontend nunca comunica diretamente com o backend. O fluxo é:

```
Frontend (JS)
    ↓ window.electronAPI
preload.js (ipcRenderer)
    ↓ ipcMain
main.js
    ↓ stdin                          ↓ execFile (pontual)
TraxxerBackend.exe          TraxxerKeyAnalyzer.exe
    ↓ stdout                         ↓ resultado
main.js
    ↓ webContents.send
preload.js → Frontend
```

O `TraxxerBackend.exe` corre continuamente enquanto a aplicação está aberta. O `TraxxerKeyAnalyzer.exe` é invocado pontualmente quando uma faixa é carregada num deck, para analisar a tonalidade.

---

## Testes de desempenho

Os testes foram realizados diretamente na aplicação com `performance.now()`. Para correr os testes do segundo grupo, abre a consola de desenvolvimento do Electron e corre:

```javascript
correrTestes()
```

Os resultados são apresentados automaticamente numa tabela via `console.table()`.

---

## Inspiração

O Traxxer foi inspirado no [Mixxx](https://mixxx.org/), software de DJing open-source criado por Tue Haste Andersen no âmbito da sua tese de doutoramento na Universidade de Copenhaga, e tanto no [Virtual DJ](https://www.virtualdj.com/) e [DJUCED](https://www.djuced.com/) a nível gráfico, cujas interfaces serviram de referência para algumas decisões de design.

---

## Autor

**Tomás Pinto**  
Curso Profissional de Programação e Informática  
PAP — Prova de Aptidão Profissional — 2025/2026
