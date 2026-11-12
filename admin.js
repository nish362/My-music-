
(() => {
  const $ = id => document.getElementById(id);

  function message(id, text, error = false) {
    const el = $(id);
    if (!el) return;
    el.textContent = text;
    el.className = 'message' + (error ? ' error' : '');
  }

  if (!window.SUPABASE_URL || !window.SUPABASE_PUBLISHABLE_KEY) {
    message('login-msg', 'Supabase configuration missing.', true);
    return;
  }

  if (!window.supabase || !window.supabase.createClient) {
    message('login-msg', 'Supabase library did not load. Refresh.', true);
    return;
  }

  const db = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_PUBLISHABLE_KEY
  );

  const bucket = window.SONGS_BUCKET;
  let songs = [];

  function safeName(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9.-]+/g, '-')
      .slice(0, 80) || 'file';
  }

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
    const list = $('admin-list');
    list.innerHTML = '';

    if (!songs.length) {
      list.textContent = 'No songs uploaded yet.';
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
      list.append(row);
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

    message('login-msg', 'Signing in…');

    try {
      const { data, error } = await db.auth.signInWithPassword({
        email: $('email').value.trim(),
        password: $('password').value
      });

      if (error) throw error;
      if (!data.session) throw new Error('Login session was not created.');

      await dashboard();
      message('login-msg', 'Login successful!');
    } catch (error) {
      message('login-msg', error.message || 'Login failed.', true);
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
    message('form-msg', '');
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

  async function uploadFile(file, folder) {
    const extension = safeName(file.name);
    const path = folder + '/' + crypto.randomUUID() + '-' + extension;

    const contentType = file.type ||
      (folder === 'audio' ? 'audio/mpeg' : 'image/jpeg');

    const { data, error } = await db.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType
      });

    if (error) {
      console.error('Storage upload error:', error);
      throw new Error(
        'Storage upload failed: ' +
        (error.message || JSON.stringify(error))
      );
    }

    return data.path;
  }

  async function deleteSong(song) {
    if (!confirm('Delete "' + song.title + '"?')) return;

    try {
      const paths = [song.audio_path, song.cover_path].filter(Boolean);

      if (paths.length) {
        const { error } = await db.storage.from(bucket).remove(paths);
        if (error) throw error;
      }

      const { error } = await db
        .from('songs')
        .delete()
        .eq('id', song.id);

      if (error) throw error;

      await refresh();
      message('form-msg', 'Song deleted!');
    } catch (error) {
      message('form-msg', error.message, true);
    }
  }

  $('song-form').addEventListener('submit', async event => {
    event.preventDefault();

    const button = $('song-form').querySelector('.primary');
    button.disabled = true;
    message('form-msg', 'Uploading… Please wait.');

    let audioPath = '';
    let coverPath = null;
    const id = $('edit-id').value || crypto.randomUUID();
    const old = songs.find(song => song.id === id);
    const audio = $('audio-file').files[0];
    const cover = $('cover-file').files[0];

    try {
      if (!bucket) throw new Error('Bucket name is missing in config.js.');

      const { data: sessionData, error: sessionError } =
        await db.auth.getSession();

      if (sessionError) throw sessionError;
      if (!sessionData.session) {
        throw new Error('Please log in again.');
      }

      if (!old && !audio) {
        throw new Error('Please choose an MP3 file.');
      }

      audioPath = old ? old.audio_path : '';
      coverPath = old ? old.cover_path : null;

      if (audio) {
        message('form-msg', 'Uploading audio file…');
        audioPath = await uploadFile(audio, 'audio');
      }

      if (cover) {
        message('form-msg', 'Uploading cover photo…');
        coverPath = await uploadFile(cover, 'covers');
      }

      const payload = {
        title: $('title').value.trim(),
        artist: $('artist').value.trim() || 'Anna',
        audio_path: audioPath,
        cover_path: coverPath
      };

      if (!payload.title) throw new Error('Enter a song title.');

      message('form-msg', 'Saving song details…');

      const result = old
        ? await db.from('songs').update(payload).eq('id', id)
        : await db.from('songs').insert({ id, ...payload });

      if (result.error) throw result.error;

      resetForm();
      await refresh();
      message('form-msg', old ? 'Changes saved!' : 'Song uploaded successfully!');

    } catch (error) {
      console.error('Song upload failed:', error);
      message(
        'form-msg',
        error.message || 'Upload failed. Please try again.',
        true
      );
    } finally {
      button.disabled = false;
    }
  });

  db.auth.getSession()
    .then(({ data, error }) => {
      if (error) throw error;
      if (data.session) dashboard();
    })
    .catch(error => {
      message('login-msg', error.message, true);
    });
})();
