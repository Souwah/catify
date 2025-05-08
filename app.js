// Core config
const grid = document.getElementById('breedGrid');
const searchInput = document.getElementById('breedSearch');

const SPOTIFY_AUTH_URL = 'https://accounts.spotify.com/authorize';
const SCOPES = [
  'playlist-modify-private',
  'playlist-modify-public',
  'user-read-private',
  'user-read-email'
];

const temperamentToGenre = {
  Affectionate: 'chill',
  Curious: 'indie',
  Intelligent: 'jazz',
  Playful: 'pop',
  Active: 'dance',
  Lazy: 'ambient',
  Social: 'funk',
  Quiet: 'classical',
  Loyal: 'acoustic',
  Energetic: 'electronic',
  Bold: 'rock',
  Shy: 'lo-fi'
};

let allBreeds = [];
let selectedBreeds = [];

function showPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function getSpotifyLoginURL() {
  const scopeParam = SCOPES.join(' ');
  return `${SPOTIFY_AUTH_URL}?response_type=code&client_id=${encodeURIComponent(CLIENT_ID)}&scope=${encodeURIComponent(scopeParam)}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
}

document.getElementById('spotifyLoginBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/.netlify/functions/get-login-url');
    const data = await res.json();
    window.location.href = data.url;
  } catch (err) {
    console.error('Failed to fetch Spotify login URL:', err);
    alert('Something went wrong while logging in with Spotify.');
  }
});

document.getElementById('startBtn').addEventListener('click', () => {
  showPage('page-select');
  loadCatBreeds();
});

document.getElementById('backBtn').addEventListener('click', () => {
  showPage('page-landing');
});

document.getElementById('backToSelectBtn').addEventListener('click', () => {
  showPage('page-select');
});

document.getElementById('modalLoginBtn').addEventListener('click', () => {
  const url = getSpotifyLoginURL();
  window.location.href = url;
});

document.getElementById('modalCancelBtn').addEventListener('click', () => {
  document.getElementById('spotifyModal').style.display = 'none';
});

document.getElementById('catifyBtn').addEventListener('click', async () => {
  const code = localStorage.getItem('spotify_auth_code');
  if (!code) {
    document.getElementById('spotifyModal').style.display = 'flex';
    return;
  }

  showPage('page-result');

  const accessToken = localStorage.getItem('spotify_access_token');
  const genres = getGenresFromSelectedBreeds();

  try {
    const { tracks, playlistUrl } = await createSpotifyPlaylistAndAddTracks(genres, accessToken);

    const playlist = document.getElementById('playlist');
    playlist.innerHTML = '';

    // 👇 Add the Spotify link at the top
    const playlistLink = document.createElement('a');
    playlistLink.href = playlistUrl;
    playlistLink.textContent = '🎵 Open this playlist in Spotify';
    playlistLink.target = '_blank';
    playlistLink.className = 'playlist-link';
    playlist.appendChild(playlistLink);

    // 👇 Render each track visually
    tracks.forEach(track => {
      const div = document.createElement('div');
      div.className = 'track';

      const img = document.createElement('img');
      img.src = track.album.images[2]?.url || '';
      img.alt = track.name;

      const info = document.createElement('div');
      info.className = 'track-info';
      info.innerHTML = `
        <span>${track.name}</span>
        <span class="artist">${track.artists.map(a => a.name).join(', ')}</span>
      `;

      div.appendChild(img);
      div.appendChild(info);
      playlist.appendChild(div);
    });

  } catch (err) {
    console.error('Failed to create or display Spotify playlist:', err);
  }
});


searchInput.addEventListener('input', () => {
  const term = searchInput.value.toLowerCase();
  const filtered = allBreeds.filter(b => b.name.toLowerCase().includes(term));
  renderBreeds(filtered);
});

window.addEventListener('DOMContentLoaded', () => {
  const code = localStorage.getItem('spotify_auth_code');
  const infoText = document.querySelector('.spotify-info');
  const loginBtn = document.getElementById('spotifyLoginBtn');

  if (code) {
    if (infoText) infoText.style.display = 'none';
    if (loginBtn) loginBtn.textContent = 'Logged in to Spotify 🎉';
    loginBtn.disabled = true;
    loginBtn.style.cursor = 'default';
    loginBtn.style.opacity = '0.8';
  }
});

async function loadCatBreeds() {
  grid.innerHTML = '<p>Loading breeds...</p>';
  try {
    const res = await fetch('/.netlify/functions/get-cat-breeds');
    const breeds = await res.json();
    allBreeds = breeds.filter(b => b.id);
    renderBreeds(allBreeds);
  } catch (err) {
    console.error('🐱 Error fetching cat breeds:', err);
    grid.innerHTML = '<p>Something went wrong. Check the console.</p>';
  }
}

document.getElementById('spotifyLogoutBtn').addEventListener('click', () => {
  localStorage.removeItem('spotify_auth_code');
  localStorage.removeItem('spotify_access_token');
  alert('Logged out (debug mode). Refreshing...');
  window.location.reload();
});

async function renderBreeds(breeds) {
  grid.innerHTML = '';
  for (const breed of breeds.slice(0, 30)) {
    const box = document.createElement('div');
    box.className = 'breed-box';

    const img = document.createElement('img');
    img.alt = breed.name;

    try {
      const imgRes = await fetch(`/.netlify/functions/get-cat-image?breed_id=${breed.id}`);
      const imgData = await imgRes.json();
      img.src = imgData[0]?.url || '';
    } catch {
      img.src = '';
    }

    const name = document.createElement('span');
    name.textContent = breed.name;

    box.addEventListener('click', () => {
      const isSelected = box.classList.toggle('selected');
      if (isSelected) selectedBreeds.push(breed.id);
      else selectedBreeds = selectedBreeds.filter(id => id !== breed.id);
    });

    box.appendChild(img);
    box.appendChild(name);
    grid.appendChild(box);
  }
}

function getGenresFromSelectedBreeds() {
  const selected = allBreeds.filter(b => selectedBreeds.includes(b.id));
  const traits = new Set();

  selected.forEach(breed => {
    if (breed.temperament) {
      breed.temperament.split(',').map(t => t.trim()).forEach(trait => {
        if (temperamentToGenre[trait]) traits.add(temperamentToGenre[trait]);
      });
    }
  });

  return Array.from(traits);
}

async function createSpotifyPlaylistAndAddTracks(genres, accessToken) {
  const userRes = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  const userData = await userRes.json();
  const userId = userData.id;

  // Step 1: Create a playlist
  const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Catify Playlist 🐾',
      description: 'A playlist based on your cat\'s vibe',
      public: false
    })
  });

  const playlistData = await createRes.json();
  const playlistId = playlistData.id;

  // Step 2: Fetch recommended tracks
  const seedGenres = genres.slice(0, 5).join(',');
  const recRes = await fetch(`https://api.spotify.com/v1/recommendations?limit=20&seed_genres=${seedGenres}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const recData = await recRes.json();
  const trackUris = recData.tracks.map(track => track.uri);

  // Step 3: Add tracks to playlist
  await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      uris: trackUris
    })
  });

  return {
    tracks: recData.tracks,
    playlistUrl: playlistData.external_urls.spotify
  };
  
}


