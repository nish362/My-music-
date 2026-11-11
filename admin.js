(() => {
  const $ = id => document.getElementById(id);

  const loginMsg = $('login-msg');

  function showMessage(id, message, error = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = message;
    el.className = 'message' + (error ? ' error' : '');
  }

  // Check Supabase configuration
  if (!window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY) {
    showMessage('login-msg', 'Supabase configuration missing.', true);
    return;
  }

  // Check Supabase library
  if (!window.supabase || !window.supabase.createClient) {
    showMessage('login-msg', 'Supabase library did not load. Refresh the page.', true);
    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_PUBLISHABLE_KEY
  );

  const bucket = window.SONGS_BUCKET;
  let songs = [];

  async function refresh() {
    const { data, error } = await db
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      $('admin-list').textContent = 'Could not load songs: ' + error.message;
      return;
    }

    songs = data || [];
    $('admin-list').innerHTML = '';

    if (!songs.length) {
      $('admin-list').textContent = 'No songs uploaded yet.';
      return;
    }

    songs.forEach(song => {
      const row = document.createElement('div');
      row.className = 'admin-song';

      const title = document.createElement('strong');
      title.textContent = song.title;

      const artist = document.createElement('small');
      artist.textContent = song.artist || 'Anna';

      const edit = document.createElement('button');
      edit.textContent = 'Edit';
      edit.className = 'ghost small';
      edit.onclick = () => editSong(song);

      const del = document.createElement('button');
      del.textContent = 'Delete';
      del.className = 'danger small';
      del.onclick = () => deleteSong(song);

      row.append(title, artist, edit, del);
      $('admin-list').append(row);
    });
  }

  async function dashboard() {
    const { data, error } = await db.auth.getUser();

    if (error || !data.user) return;

    $('login-card').hidden = true;
    $('dashboard').hidden = false;
    $('admin-email').textContent = data.user.email || '';

    await refresh();
  }

  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();

    const email = $('email').value.trim();
    const password = $('password').value;

    showMessage('login-msg', 'Signing in…');

    try {
      const { data, error } = await db.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (!data.session) {
        throw new Error('Login session was not created.');
      }

      showMessage('login-msg', 'Login successful!');
      await dashboard();

    } catch (error) {
      showMessage(
        'login-msg',
        error.message || 'Login failed. Please try again.',
        true
      );
    }
  });

  $('logout').onclick = async () => {
    await db.auth.signOut();
    $('dashboard').hidden = true;
    $('login-card').hidden = false;
  };

  function resetForm() {
    $('song-form').reset();
    $('edit-id').value = '';
    $('artist').value = 'Anna';
    $('audio-file').required = true;
    $('form-title').textContent = 'Add a song';
    $('song-form').querySelector('.primary').textContent = 'Upload song';
    $('cancel-edit').hidden = true;
    showMessage('form-msg', '');
  }

  $('cancel-edit').onclick = resetForm;

  function editSong(song) {
    $('edit-id').value = song.id;
    $('title').value = song.title;
    $('artist').value = song.artist || 'Anna';
    $('audio-file').required = false;
    $('form-title').textContent = 'Edit song';
    $('song-form').querySelector('.primary').textContent = 'Save changes';
    $('cancel-edit').hidden = false;
    $('song-form').scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteSong(song) {
    if (!confirm('Delete "' + song.title + '"?')) return;

    try {
      const paths = [song.audio_path, song.cover_path].filter(Boolean);

      const { error: fileError } = await db.storage
        .from(bucket).remove(paths);

      if (fileError) throw fileError;

      const { error } = await db.from('songs').delete().eq('id', song.id);
      if (error) throw error;

      await refresh();
      showMessage('form-msg', 'Song deleted.');

    } catch (error) {
      showMessage('form-msg', error.message, true);
    }
  }

  function safeName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
      .slice(0, 90) || 'file';
  }

  $('song-form').addEventListener('submit', async event => {
    event.preventDefault();
    showMessage('form-msg', 'Uploading…');

    const id = $('edit-id').value || crypto.randomUUID();
    const old = songs.find(song => song.id === id);
    const audio = $('audio-file').files[0];
    const cover = $('cover-file').files[0];

    let audioPath = old?.audio_path || '';
    let coverPath = old?.cover_path || null;

    try {
      async function upload(file, kind) {
        const path = id + '/' + kind + '-' + Date.now() + '-' + safeName(file.name);

        const { error } = await db.storage.from(bucket).upload(path, file, {
          upsert: false,
          contentType: file.type || undefined
        });

        if (error) throw error;
        return path;
      }

      if (audio) audioPath = await upload(audio, 'audio');
      if (!old && !audio) throw new Error('Choose an audio file.');
      if (cover) coverPath = await upload(cover, 'cover');

      const payload = {
        title: $('title').value.trim(),
        artist: $('artist').value.trim() || 'Anna',
        audio_path: audioPath,
        cover_path: coverPath
      };

      const result = old
        ? await db.from('songs').update(payload).eq('id', id)
        : await db.from('songs').insert({ id, ...payload });

      if (result.error) throw result.error;

      resetForm();
      await refresh();
      showMessage('form-msg', old ? 'Changes saved!' : 'Song uploaded!');

    } catch (error) {
      showMessage('form-msg', error.message || 'Upload failed.', true);
    }
  });

  db.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      if (data.session) dashboard();
    })
    .catch(error => {
      showMessage('login-msg', error.message, true);
    });

})();
