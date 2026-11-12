(() => {
  const $ = id => document.getElementById(id);

  const grid = $('songs-grid');
  const audio = $('audio');
  const search = $('search');
  const count = $('song-count');

  function showError(message) {
    if (grid) {
      grid.innerHTML = `<div class="empty">${message}</div>`;
    }
  }

  if (!grid || !audio || !search || !count) {
    showError('Website setup error: HTML elements are missing.');
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    showError('Supabase library did not load. Please refresh the page.');
    return;
  }

  if (!window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY) {
    showError('Supabase configuration is missing.');
    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_PUBLISHABLE_KEY
  );

  let songs = [];

  function publicUrl(path) {
    if (!path) return '';
    return db.storage
      .from(window.SONGS_BUCKET)
      .getPublicUrl(path).data.publicUrl;
  }

  function playSong(song) {
    audio.src = publicUrl(song.audio_path);
    audio.play().catch(() => {
      showError('Play button dabakar audio chalao.');
    });

    const player = $('player');
    if (player) player.hidden = false;

    if ($('now-title')) $('now-title').textContent = song.title;
    if ($('now-artist')) {
      $('now-artist').textContent = song.artist || 'Anna';
    }
  }

  function render() {
    const query = search.value.trim().toLowerCase();

    const filtered = songs.filter(song =>
      `${song.title || ''} ${song.artist || ''}`
        .toLowerCase().includes(query)
    );

    count.textContent = `${songs.length} songs`;

    if (!filtered.length) {
      showError('No songs found.');
      return;
    }

    grid.innerHTML = '';

    filtered.forEach(song => {
      const card = document.createElement('div');
      card.className = 'song';

      const cover = document.createElement('img');
      cover.className = 'cover';
      cover.alt = 'Song cover';
      cover.src = song.cover_path
        ? publicUrl(song.cover_path)
        : 'cover-placeholder.svg';

      const info = document.createElement('div');
      info.className = 'song-info';

      const title = document.createElement('strong');
      title.textContent = song.title || 'Untitled';

      const artist = document.createElement('small');
      artist.textContent = song.artist || 'Anna';

      info.append(title, artist);

      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = '▶ Play';
      button.addEventListener('click', () => playSong(song));

      card.append(cover, info, button);
      grid.append(card);
    });
  }

  search.addEventListener('input', render);

  async function loadSongs() {
    showError('Loading songs...');

    try {
      const { data, error } = await db
        .from('songs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        showError('Could not load songs: ' + error.message);
        return;
      }

      songs = data || [];
      render();

    } catch (error) {
      showError('Connection error: ' + error.message);
    }
  }

  loadSongs();
})();

