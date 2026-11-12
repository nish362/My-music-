(() => {
  const $ = id => document.getElementById(id);
  const grid=$('songs-grid'),audio=$('audio'),search=$('search'),count=$('song-count');
  const albumsGrid=$('albums-grid');
  if(!grid||!audio||!search||!count)return;
  if(!window.supabase?.createClient||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){
    grid.textContent='Website connection is unavailable. Please refresh.';return;
  }
  const db=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
  let songs=[],albums=[],links=[],activeAlbum=null;
  const publicUrl=p=>p?db.storage.from(window.SONGS_BUCKET).getPublicUrl(p).data.publicUrl:'';
  function showPlaying(song){
    audio.src=publicUrl(song.audio_path);
    audio.play().catch(()=>{});
    const player=$('player');if(player)player.hidden=false;
    if($('now-title'))$('now-title').textContent=song.title||'Untitled';
    if($('now-artist'))$('now-artist').textContent=song.artist||'Anna';
  }
  function renderAlbums(){
    if(!albumsGrid)return;
    albumsGrid.innerHTML='';
    const all=document.createElement('button');
    all.type='button';all.textContent=activeAlbum===null?'✓ All songs':'All songs';
    all.style.cssText='min-height:48px;background:#30233f;color:#fff';
    all.onclick=()=>{activeAlbum=null;renderAlbums();renderSongs();};
    albumsGrid.append(all);
    albums.forEach(album=>{
      const card=document.createElement('button');card.type='button';
      card.style.cssText='display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:10px;background:#21182f;color:#fff;border:1px solid #493752;border-radius:14px;text-align:left';
      if(activeAlbum===album.id)card.style.outline='2px solid #c88bdc';
      const img=document.createElement('img');img.src=publicUrl(album.cover_path)||'cover-placeholder.svg';img.alt='';img.style.cssText='width:100%;aspect-ratio:1;object-fit:cover;border-radius:9px';
      const name=document.createElement('strong');name.textContent=album.title;
      const n=links.filter(x=>x.album_id===album.id).length;
      const small=document.createElement('small');small.textContent=n+' songs';small.style.color='#c2b4ce';
      card.append(img,name,small);
      card.onclick=()=>{activeAlbum=activeAlbum===album.id?null:album.id;renderAlbums();renderSongs();};
      albumsGrid.append(card);
    });
  }
  function renderSongs(){
    const q=search.value.trim().toLowerCase();
    let visible=songs;
    if(activeAlbum!==null){
      const ids=links.filter(x=>x.album_id===activeAlbum).map(x=>x.song_id);
      visible=visible.filter(s=>ids.includes(s.id));
    }
    visible=visible.filter(s=>(String(s.title||'')+' '+String(s.artist||'')).toLowerCase().includes(q));
    count.textContent=visible.length+' songs'+(activeAlbum!==null?' in album':'');
    grid.innerHTML='';
    if(!visible.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No songs found.';grid.append(empty);return;}
    visible.forEach(song=>{
      const card=document.createElement('div');card.className='song';
      const cover=document.createElement('img');cover.className='cover';cover.alt='Song cover';cover.src=publicUrl(song.cover_path)||'cover-placeholder.svg';
      const info=document.createElement('div');info.className='song-info';
      const title=document.createElement('strong');title.textContent=song.title||'Untitled';
      const artist=document.createElement('small');artist.textContent=song.artist||'Anna';info.append(title,artist);
      const btn=document.createElement('button');btn.type='button';btn.textContent='▶ Play';btn.addEventListener('click',()=>showPlaying(song));
      card.append(cover,info,btn);grid.append(card);
    });
  }
  search.addEventListener('input',renderSongs);
  async function load(){
    grid.textContent='Loading songs…';
    const {data:s,error}=await db.from('songs').select('*').order('created_at',{ascending:false});
    if(error){grid.textContent='Could not load songs: '+error.message;return;}
    songs=s||[];
    const [a,l]=await Promise.all([
      db.from('albums').select('*').order('created_at',{ascending:false}),
      db.from('album_songs').select('*')
    ]);
    albums=a.error?[]:(a.data||[]);
    links=l.error?[]:(l.data||[]);
    renderAlbums();renderSongs();
  }
  load();
})();
