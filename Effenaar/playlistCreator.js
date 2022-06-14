const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const fs = require('fs')

const img = fs.readFileSync('spotifyLogo.jpeg', 'base64')
const scopes = [
    'ugc-image-upload',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'app-remote-control',
    'user-read-email',
    'user-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-read-private',
    'playlist-modify-private',
    'user-library-modify',
    'user-library-read',
    'user-top-read',
    'user-read-playback-position',
    'user-read-recently-played',
    'user-follow-read',
    'user-follow-modify'
];

const app = express();


const spotifyApi = new SpotifyWebApi({
    redirectUri: 'http://localhost:8888/callback',
    clientId: 'a55fd7ccd97c4300a7f057758ad5674c',
    clientSecret: 'e632361f4fee4c408afe293ec2c56ebc'
});


app.get('/callback', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;

    if (error) {
        console.error('Callback Error:', error);
        res.send(`Callback Error: ${error}`);
        return;
    }

    let playlistId;

    spotifyApi
        .authorizationCodeGrant(code)
        .then(async (data) => {
            //sets token
            const access_token = data.body['access_token'];
            const refresh_token = data.body['refresh_token'];

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);



            // creates a playlist
            return spotifyApi.createPlaylist(
                'HitTheCity'
            );
        })
        .then(async(data) => {
            playlistId = data.body['id']
            let artists = ['hang youth', 'ray fuego', 'reinier zonneveld', 'sor', 'eric satie']
            let tracks = []
            for (let i = 0; i < artists.length; i++) {
                let artist = await spotifyApi.searchArtists(artists[i])
                let topTracks = await spotifyApi.getArtistTopTracks(artist.body.artists.items[0].id, 'NL')
                for (let j = 0; j < 5; j++) {
                    tracks.push('spotify:track:'+topTracks.body.tracks[j].id)
                }
            }
            console.log(img.length)
            await spotifyApi.addTracksToPlaylist(playlistId, tracks)
            try{
                await spotifyApi.uploadCustomPlaylistCoverImage(playlistId, img)
            }catch (e){
                console.log(e)
            }
        })
});

app.get('/login', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});


app.listen(8888, () =>
    console.log(
        'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
    )
);
