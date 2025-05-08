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

const temperamentToGenres = {
  Affectionate: ['chill', 'acoustic'],
  Curious: ['indie', 'electronic'],
  Intelligent: ['jazz', 'classical'],
  Playful: ['pop', 'party'],
  Active: ['dance', 'edm'],
  Lazy: ['ambient', 'sleep'],
  Social: ['funk', 'disco'],
  Quiet: ['classical', 'sleep'],
  Loyal: ['acoustic', 'folk'],
  Energetic: ['electronic', 'rock'],
  Bold: ['rock', 'punk'],
  Shy: ['study', 'rainy-day']
};

let allBreeds = [];
let selectedBreeds = [];

function showPage(id) {
  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  document.getElementById(id).classList.add('active');
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
    console.log('Selected genres:', genres);
    if (!genres || genres.length === 0) {
      alert('No genres found based on selected cat temperament.');
      return;
    }
    const playlist = document.getElementById('playlist');
    playlist.innerHTML = '';

    const playlistLink = document.createElement('a');
    playlistLink.href = playlistUrl;
    playlistLink.textContent = '🎵 Open this playlist in Spotify';
    playlistLink.target = '_blank';
    playlistLink.className = 'playlist-link';
    const embed = document.createElement('iframe');
    embed.src = `https://open.spotify.com/embed/playlist/${playlistUrl.split('/playlist/')[1]}?utm_source=generator`;
    embed.width = '100%';
    embed.height = '152';
    embed.frameBorder = '0';
    embed.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
    embed.loading = 'lazy';
    embed.style.marginTop = '20px';

    playlist.appendChild(embed);


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

document.getElementById('spotifyLogoutBtn').addEventListener('click', () => {
  localStorage.removeItem('spotify_auth_code');
  localStorage.removeItem('spotify_access_token');
  alert('Logged out (debug mode). Refreshing...');
  window.location.reload();
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
        if (temperamentToGenres[trait]) {
          temperamentToGenres[trait].forEach(genre => traits.add(genre));
        }
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

  const createRes = await fetch(`https://api.spotify.com/v1/users/${userId}/playlists`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `Catify: ${selectedBreeds.map(id => {
        const breed = allBreeds.find(b => b.id === id);
         return breed?.name || 'Unknown';
       }).join(', ')}`,
      description: `Made from these cat vibes: ${genres.join(', ')}`,
      public: false
      })

  });

  const playlistData = await createRes.json();
  const playlistId = playlistData.id;

// Step 2: Search for tracks by genre instead of recommendations
function shuffle(array) {
  return [...array].sort(() => Math.random() - 0.5);
}

const shuffled = shuffle(genres);
const seedGenres = shuffled.slice(0, 3); // try 1–3 genres max
let trackUris = [];

for (const genre of seedGenres) {
  const searchRes = await fetch(`https://api.spotify.com/v1/search?q=genre:${encodeURIComponent(genre)}&type=track&limit=7`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  const searchData = await searchRes.json();
  const foundTracks = searchData.tracks?.items || [];

  const uris = foundTracks
    .map(track => track.uri)
    .filter(uri => uri && uri.startsWith('spotify:track:'));

  trackUris.push(...uris);
}

// Shuffle & deduplicate
trackUris = [...new Set(shuffle(trackUris))].slice(0, 20); // Max 100 for Spotify, but 20 here

console.log('🎯 Final genre seeds:', seedGenres);
console.log('🎶 Final tracks from search:', trackUris);


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
