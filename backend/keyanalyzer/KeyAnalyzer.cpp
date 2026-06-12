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
        std::cout << "--" << std::endl;
        return 1;
    }

    const int sampleRate = sfInfo.samplerate;
    const int channels   = sfInfo.channels;
    const long frames    = sfInfo.frames;
    const long maxFrames = std::min(frames, (long)(sampleRate * 60));

    std::vector<float> buffer(maxFrames * channels);
    sf_readf_float(file, buffer.data(), maxFrames);
    sf_close(file);

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