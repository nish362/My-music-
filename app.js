
(() => {
  const $ = id => document.getElementById(id);
  const grid = $('song-grid');
  const audio = $('audio');

  const ok =
    window.SUPABASE_URL?.startsWith('https://') &&
    window.SUPABASE_PUBLISHABLE_KEY &&
    !window.SUPABASE_PUBLISHABLE_KEY.startsWith('PASTE_');

  if (!ok) {
    grid.innerHTML = '<p class="empty">Supabase setup needed. Check config.js.</p>';
    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_PUBLISHABLE_KEY
  );

  let songs = [];

  const url = path =>
    db.storage.from(window.SONGS_BUCKET).getPublicUrl(path).data.publicUrl;

  function play(song) {
    $('player').hidden = false;
    $('now-title').textContent = song.title;
    $('now-artist').textContent = song.artist || 'Anna';
    $('now-cover').src = song.cover_path
      ? url(song.cover_path)
      : 'cover-placeholder.svg';

    audio.src = url(song.audio_path);
    audio.play().catch(() => {});
    $('player').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function render() {
    const q = $('search').value.trim().toLowerCase();

    const list = songs.filter(song =>
      (song.title + ' ' + (song.artist || '')).toLowerCase().includes(q)
    );

    $('song-count').textContent = songs.length;

    if (!list.length) {
      grid.innerHTML = '<p class="empty">No songs found yet. Check back soon ♡</p>';
      return;
    }

    grid.innerHTML = '';

    list.forEach(song => {
      const card = document.createElement('article');
      card.className = 'song-card';

      const img = document.createElement('img');
      img.className = 'cover';
      img.alt = '';
      img.src = song.cover_path ? url(song.cover_path) : 'cover-placeholder.svg';

      const info = document.createElement('div');
      info.className = 'song-info';

      const title = document.createElement('strong');
      title.textContent = song.title;

      const artist = document.createElement('span');
      artist.textContent = song.artist || 'Anna';

      info.append(title, artist);

      const button = document.createElement('button');
      button.className = 'play-btn';
      button.textContent = '▶';
      button.type = 'button';
      button.setAttribute('aria-label', 'Play ' + song.title);
      button.onclick = () => play(song);

      card.append(img, info, button);
      grid.append(card);
    });
  }

  $('search').addEventListener('input', render);

  db.from('songs')
    .select('*')
    .order('created_at', { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        grid.innerHTML = '<p class="empty">Could not load songs. Check Supabase setup and table permissions.</p>';
        return;
      }

      songs = data || [];
      render();
    });
})();
