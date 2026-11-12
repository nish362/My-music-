(() => {
  const $ = id => document.getElementById(id);
  const grid=$('songs-grid'),audio=$('audio'),search=$('search'),count=$('song-count');
  const albumsGrid=$('albums-grid');
  if(!grid||!audio||!search||!count)return;
  if(!window.supabase?.createClient||!window.SUPABASE_URL||!window.SUPABASE_PUBLISHABLE_KEY){
    grid.textContent='Website connection is unavailable. Please refresh.';return;
  }
  const db=window.supabase.createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
  let songs=[],albums=[],links=[],activeAlbum=null,currentVisible=[],playQueue=[],currentIndex=-1;
  let seeking=false;
  const publicUrl=p=>p?db.storage.from(window.SONGS_BUCKET).getPublicUrl(p).data.publicUrl:'';
  const coverUrl=song=>publicUrl(song?.cover_path)||'cover-placeholder.svg';
  const setSafeCover=(img,song)=>{img.src=coverUrl(song);img.onerror=()=>{img.onerror=null;img.src='cover-placeholder.svg';};};
  const timeText=value=>{
    if(!Number.isFinite(value))return '0:00';
    const m=Math.floor(value/60),s=Math.floor(value%60);
    return m+':'+String(s).padStart(2,'0');
  };
  function updatePlayButton(){
    const btn=$('toggle-play');
    if(btn){btn.textContent=audio.paused?'▶':'Ⅱ';btn.setAttribute('aria-label',audio.paused?'Play':'Pause');}
  }
  function updateProgress(){
    const slider=$('progress');
    if(!slider)return;
    if(!seeking&&Number.isFinite(audio.duration)&&audio.duration>0){
      slider.value=String(Math.round(audio.currentTime/audio.duration*1000));
    }
    $('elapsed').textContent=timeText(audio.currentTime);
    $('duration').textContent=timeText(audio.duration);
  }
  function updateMediaSession(song){
    if(!('mediaSession' in navigator))return;
    try{
      if('MediaMetadata' in window){
        navigator.mediaSession.metadata=new MediaMetadata({
          title:song.title||'Untitled',artist:song.artist||'Anna',album:"Anna's Song",
          artwork:[96,128,192,256,384,512].map(size=>({src:coverUrl(song),sizes:size+'x'+size,type:'image/svg+xml'}))
        });
      }
      navigator.mediaSession.setActionHandler('play',()=>audio.play());
      navigator.mediaSession.setActionHandler('pause',()=>audio.pause());
      navigator.mediaSession.setActionHandler('previoustrack',playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack',playNext);
      navigator.mediaSession.setActionHandler('seekbackward',details=>{audio.currentTime=Math.max(0,audio.currentTime-(details.seekOffset||10));});
      navigator.mediaSession.setActionHandler('seekforward',details=>{audio.currentTime=Math.min(audio.duration||Infinity,audio.currentTime+(details.seekOffset||10));});
    }catch(_){}
  }
  function showPlaying(song,queue=currentVisible){
    playQueue=queue.length?queue:[song];
    currentIndex=playQueue.findIndex(item=>item.id===song.id);
    if(currentIndex<0){playQueue=[song];currentIndex=0;}
    const cover=$('now-cover');
    if(cover){setSafeCover(cover,song);cover.alt=(song.title||'Song')+' cover';cover.style.animation='none';void cover.offsetWidth;cover.style.animation='coverIn .55s ease both';}
    $('now-title').textContent=song.title||'Untitled';
    $('now-artist').textContent=song.artist||'Anna';
    audio.src=publicUrl(song.audio_path);
    audio.load();
    updateMediaSession(song);
    audio.play().then(updatePlayButton).catch(updatePlayButton);
  }
  function playNext(){
    if(!playQueue.length)return;
    const next=(currentIndex+1)%playQueue.length;
    showPlaying(playQueue[next],playQueue);
  }
  function playPrevious(){
    if(audio.currentTime>3){audio.currentTime=0;return;}
    if(!playQueue.length)return;
    const prev=(currentIndex-1+playQueue.length)%playQueue.length;
    showPlaying(playQueue[prev],playQueue);
  }
  $('toggle-play').addEventListener('click',()=>{
    if(!audio.src){if(currentVisible.length)showPlaying(currentVisible[0],currentVisible);return;}
    if(audio.paused)audio.play().catch(()=>{});else audio.pause();
  });
  $('next').addEventListener('click',playNext);
  $('previous').addEventListener('click',playPrevious);
  $('progress').addEventListener('input',()=>{seeking=true;});
  $('progress').addEventListener('change',e=>{
    if(Number.isFinite(audio.duration)&&audio.duration>0)audio.currentTime=(Number(e.target.value)/1000)*audio.duration;
    seeking=false;updateProgress();
  });
  audio.addEventListener('timeupdate',updateProgress);
  audio.addEventListener('loadedmetadata',updateProgress);
  audio.addEventListener('durationchange',updateProgress);
  audio.addEventListener('play',updatePlayButton);
  audio.addEventListener('pause',updatePlayButton);
  audio.addEventListener('ended',playNext);

  function renderAlbums(){
    if(!albumsGrid)return;
    albumsGrid.innerHTML='';
    const all=document.createElement('button');
    all.type='button';all.className='all-songs';all.textContent=activeAlbum===null?'✓ All songs':'All songs';
    all.onclick=()=>{activeAlbum=null;renderAlbums();renderSongs();};
    albumsGrid.append(all);
    albums.forEach(album=>{
      const card=document.createElement('button');card.type='button';card.className='album-card'+(activeAlbum===album.id?' active':'');
      const img=document.createElement('img');setSafeCover(img,album);img.alt=album.title+' cover';
      const name=document.createElement('strong');name.textContent=album.title;
      const n=links.filter(x=>x.album_id===album.id).length;
      const small=document.createElement('small');small.textContent=n+' songs';
      card.append(img,name,small);
      card.onclick=()=>{activeAlbum=activeAlbum===album.id?null:album.id;renderAlbums();renderSongs();};
      albumsGrid.append(card);
    });
  }
  function renderSongs(){
    const q=search.value.trim().toLowerCase();
    const albumSongIds=new Set(links.map(x=>x.song_id));
    let visible=songs;
    if(activeAlbum!==null){
      const ids=new Set(links.filter(x=>x.album_id===activeAlbum).map(x=>x.song_id));
      visible=visible.filter(s=>ids.has(s.id));
    }else visible=visible.filter(s=>!albumSongIds.has(s.id));
    visible=visible.filter(s=>(String(s.title||'')+' '+String(s.artist||'')).toLowerCase().includes(q));
    currentVisible=visible;
    count.textContent=visible.length+' songs'+(activeAlbum!==null?' in album':'');
    grid.innerHTML='';
    if(!visible.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No songs found.';grid.append(empty);return;}
    visible.forEach(song=>{
      const card=document.createElement('div');card.className='song';
      const cover=document.createElement('img');cover.className='cover';cover.alt='Song cover';setSafeCover(cover,song);
      const info=document.createElement('div');info.className='song-info';
      const title=document.createElement('strong');title.textContent=song.title||'Untitled';
      const artist=document.createElement('small');artist.textContent=song.artist||'Anna';info.append(title,artist);
      const btn=document.createElement('button');btn.type='button';btn.className='play-button';btn.textContent='▶ Play';
      btn.addEventListener('click',()=>showPlaying(song,currentVisible));
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
    renderAlbums();renderSongs();updateProgress();
  }
  load();
})();