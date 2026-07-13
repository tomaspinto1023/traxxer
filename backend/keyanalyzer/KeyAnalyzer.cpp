#include <iostream>
#include <string>
#include <vector>
#include <algorithm>
#include <sndfile.h>
#include <keyfinder/keyfinder.h>

int main(int argc, char* argv[])
{
    if (argc < 2)
    {
        std::cerr << "Uso: TraxxerKeyAnalyzer.exe <ficheiro>" << std::endl;
        return 1;
    }

    const std::string filePath = argv[1];

    SF_INFO sfInfo{};
    SNDFILE* file = sf_open(filePath.c_str(), SFM_READ, &sfInfo);

    if (!file)
    {
        // [DEBUG] Vai para stderr, não interfere com o stdout que a app lê.
        std::cerr << "[DEBUG] sf_open falhou para \"" << filePath << "\": "
                   << sf_strerror(nullptr) << std::endl;
        std::cout << "--" << std::endl;
        // "--" e' um resultado valido (nao foi possivel ler o ficheiro), nao um
        // erro do programa em si — sair com 0 para o main.js nao descartar o
        // stdout (execFile trata qualquer codigo != 0 como falha e ignora o
        // que foi impresso).
        return 0;
    }

    std::cerr << "[DEBUG] sf_open OK — samplerate=" << sfInfo.samplerate
               << " channels=" << sfInfo.channels
               << " frames=" << sfInfo.frames
               << " format=0x" << std::hex << sfInfo.format << std::dec << std::endl;

    const int sampleRate = sfInfo.samplerate;
    const int channels   = sfInfo.channels;
    const long frames    = sfInfo.frames;
    // Analisa a faixa completa (em vez de só os primeiros 60s) para um resultado mais
    // representativo em faixas com modulações/introduções tonalmente ambíguas.
    // O keyOfAudio() do libkeyfinder já faz downsampling interno antes do chromagram,
    // por isso o custo extra de ler a faixa toda mantém-se pequeno.
    const long maxFrames = frames;

    if (maxFrames <= 0)
    {
        std::cerr << "[DEBUG] maxFrames <= 0 (frames=" << frames
                   << "), nada para analisar." << std::endl;
        sf_close(file);
        std::cout << "--" << std::endl;
        return 0;
    }

    std::vector<float> buffer(maxFrames * channels);
    sf_count_t framesRead = sf_readf_float(file, buffer.data(), maxFrames);
    sf_close(file);

    std::cerr << "[DEBUG] framesRead=" << framesRead
               << " (pedidos " << maxFrames << ")" << std::endl;

    // Converte para mono
    std::vector<float> mono(maxFrames);
    for (long i = 0; i < maxFrames; i++)
    {
        float sum = 0.0f;
        for (int c = 0; c < channels; c++)
            sum += buffer[i * channels + c];
        mono[i] = sum / channels;
    }

    // Análise com libkeyfinder
    KeyFinder::AudioData audio;
    audio.setFrameRate(sampleRate);
    audio.setChannels(1);
    audio.addToSampleCount(maxFrames);

    for (long i = 0; i < maxFrames; i++)
        audio.setSample(i, mono[i]);

    KeyFinder::KeyFinder kf;
    KeyFinder::key_t key = kf.keyOfAudio(audio);

    std::cerr << "[DEBUG] key_t retornado pelo keyfinder = "
               << static_cast<int>(key) << std::endl;

    if (key == KeyFinder::SILENCE)
    {
        std::cout << "--" << std::endl;
        return 0;
    }

    const std::string noteNames[] = {
        "A", "A#", "B", "C", "C#", "D",
        "D#", "E", "F", "F#", "G", "G#"
    };

    bool isMajor  = (key % 2 == 0);
    int noteIndex = key / 2;
    std::string mode = isMajor ? "Major" : "Minor";

    std::cout << noteNames[noteIndex] << " " << mode << std::endl;
    return 0;
}