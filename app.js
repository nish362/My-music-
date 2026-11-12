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
  const publicUrl=p=>p?db.storage.from(window.SONGS_BUCKET).getPublicUrl(p).data.publicUrl:'';
  const coverUrl=song=>publicUrl(song?.cover_path)||'cover-placeholder.svg';

  function updateMediaSession(song){
    if(!('mediaSession' in navigator))return;
    try{
      if('MediaMetadata' in window){
        navigator.mediaSession.metadata=new MediaMetadata({
          title:song.title||'Untitled',
          artist:song.artist||'Anna',
          album:"Anna's Song",
          artwork:[96,128,192,256,384,512].map(size=>({src:coverUrl(song),sizes:size+'x'+size,type:'image/jpeg'}))
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
    audio.src=publicUrl(song.audio_path);
    audio.load();
    const player=$('player');if(player)player.hidden=false;
    const title=$('now-title'),artist=$('now-artist'),cover=$('now-cover');
    if(title)title.textContent=song.title||'Untitled';
    if(artist)artist.textContent=song.artist||'Anna';
    if(cover){cover.src=coverUrl(song);cover.alt=(song.title||'Song')+' cover';}
    updateMediaSession(song);
    audio.play().catch(()=>{});
  }

  function playNext(){
    if(currentIndex>=0&&currentIndex<playQueue.length-1)showPlaying(playQueue[currentIndex+1],playQueue);
  }
  function playPrevious(){
    if(currentIndex>0)showPlaying(playQueue[currentIndex-1],playQueue);
    else if(audio.currentTime>3)audio.currentTime=0;
  }
  audio.addEventListener('ended',playNext);

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
    const albumSongIds=new Set(links.map(x=>x.song_id));
    let visible=songs;
    if(activeAlbum!==null){
      const ids=new Set(links.filter(x=>x.album_id===activeAlbum).map(x=>x.song_id));
      visible=visible.filter(s=>ids.has(s.id));
    }else{
      visible=visible.filter(s=>!albumSongIds.has(s.id));
    }
    visible=visible.filter(s=>(String(s.title||'')+' '+String(s.artist||'')).toLowerCase().includes(q));
    currentVisible=visible;
    count.textContent=visible.length+' songs'+(activeAlbum!==null?' in album':'');
    grid.innerHTML='';
    if(!visible.length){const empty=document.createElement('div');empty.className='empty';empty.textContent='No songs found.';grid.append(empty);return;}
    visible.forEach(song=>{
      const card=document.createElement('div');card.className='song';
      const cover=document.createElement('img');cover.className='cover';cover.alt='Song cover';cover.src=coverUrl(song);
      const info=document.createElement('div');info.className='song-info';
      const title=document.createElement('strong');title.textContent=song.title||'Untitled';
      const artist=document.createElement('small');artist.textContent=song.artist||'Anna';info.append(title,artist);
      const btn=document.createElement('button');btn.type='button';btn.textContent='▶ Play';btn.addEventListener('click',()=>showPlaying(song,currentVisible));
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