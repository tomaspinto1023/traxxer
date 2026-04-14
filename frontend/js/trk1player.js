//Este ficheiro é responsável por gerir funções de utilização dentro do deck uma vez que a musica estiver carregada!
//Passar lógicas de ações que estão erradamente no uploadtracks.js!

let trk1WaveSurfer = null;
let trk1CurrentObjectUrl = null;

function createTrack1WaveSurfer() {
  trk1WaveSurfer = WaveSurfer.create({
    container: '#trk1-waveform',
    waveColor: '#dbdbdb',
    progressColor: '#a12fb0',
    cursorColor: '#ffffff',
    height: 27.4,
    barWidth: 2,
    barGap: 1,
    responsive: true
  });

  return trk1WaveSurfer;
}

function getTrack1WaveSurfer() {
  return trk1WaveSurfer;
}

function loadTrack1File(file, elements) {
  const { cover, musicName, channelName, playIcon, pauseIcon } = elements;

  if (trk1CurrentObjectUrl) {
    URL.revokeObjectURL(trk1CurrentObjectUrl);
    trk1CurrentObjectUrl = null;
  }

  trk1CurrentObjectUrl = URL.createObjectURL(file);
  trk1WaveSurfer.load(trk1CurrentObjectUrl);

  musicName.textContent = removeMp3Extension(file.name);
  channelName.textContent = 'Artista desconhecido';

  cover.style.backgroundImage = '';
  cover.style.backgroundSize = 'cover';
  cover.style.backgroundPosition = 'center';
  cover.style.backgroundRepeat = 'no-repeat';

  setPlayPauseVisual(false, playIcon, pauseIcon);

  window.jsmediatags.read(file, {
    onSuccess: (tag) => {
      const tags = tag.tags;

      if (tags.title) {
        musicName.textContent = tags.title;
      }

      if (tags.artist) {
        channelName.textContent = tags.artist;
      }

      if (tags.picture) {
        const { data, format } = tags.picture;
        let binaryString = '';

        for (let i = 0; i < data.length; i++) {
          binaryString += String.fromCharCode(data[i]);
        }

        const base64String = window.btoa(binaryString);
        const imageUrl = `data:${format};base64,${base64String}`;

        cover.style.backgroundImage = `url("${imageUrl}")`;
      }
    },
    onError: (error) => {
      console.log('Erro ao ler metadata da faixa:', error);
    }
  });
}

function ejectTrack1(elements) {
  const { cover, musicName, channelName, playIcon, pauseIcon } = elements;

  if (trk1WaveSurfer) {
    trk1WaveSurfer.stop();
    trk1WaveSurfer.empty();
  }

  if (trk1CurrentObjectUrl) {
    URL.revokeObjectURL(trk1CurrentObjectUrl);
    trk1CurrentObjectUrl = null;
  }

  musicName.textContent = '';
  channelName.textContent = '';

  cover.style.backgroundImage = '';
  cover.style.backgroundSize = '';
  cover.style.backgroundPosition = '';
  cover.style.backgroundRepeat = '';

  setPlayPauseVisual(false, playIcon, pauseIcon);
}

function removeMp3Extension(filename) {
  return filename.replace(/\.mp3$/i, '');
}

function setPlayPauseVisual(isPlaying, playIcon, pauseIcon) {
  if (!playIcon || !pauseIcon) return;

  playIcon.style.display = isPlaying ? 'none' : 'inline-block';
  pauseIcon.style.display = isPlaying ? 'inline-block' : 'none';
}