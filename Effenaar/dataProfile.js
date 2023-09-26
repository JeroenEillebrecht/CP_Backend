const SpotifyWebApi = require('spotify-web-api-node');
const express = require('express');
const fs = require('fs');

const csvwriter = require('csv-writer')
const {c} = require("sinon/lib/sinon/spy-formatters");

let createCsvWriter = csvwriter.createObjectCsvWriter

// Passing the column names intp the module
const csvWriter = createCsvWriter({
    path: 'data.csv',
    header: [
        {id: 'artists', title: 'Artists'},
        {id: 'genres', title: 'Genres'},
        {id: 'energy', title: 'Energy'},
        {id: 'acousticness', title: 'Acousticness'},
        {id: 'danceability', title: 'Danceability'},
    ]
});


let artistData = [
    {
        name: 'Hang Youth',
        centroid: [0.2, 0.8, 0.9],
        score: 0,
        avgDistance: 0
    },
    {
        name: 'Global Charming',
        centroid: [0.5, 0.75, 0.3],
        score: 0,
        avgDistance: 0
    },
    {
        name: 'Personal Trainer',
        centroid: [0.1, 0.6, 0.5],
        score: 0,
        avgDistance: 0
    },
    {
        name: 'Commander Spoon',
        centroid: [0.2, 0.5, 0.8],
        score: 0,
        avgDistance: 0
    }
]

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

const spotifyApi = new SpotifyWebApi({
    redirectUri: 'http://localhost:8888/callback',

});

const app = express();

app.get('/login', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
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
    //
    spotifyApi
        .authorizationCodeGrant(code)
        .then(async (data) => {
            const access_token = data.body['access_token'];
            const refresh_token = data.body['refresh_token'];

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);

            let songInfo = await getsongInfo()

            let dataProfile = {
                artists: await getArtists(),
                genres: await getGenres(),
                dataPoints : songInfo
            }
            res.json(getMatchAverageDistance(dataProfile.dataPoints, artistData))

            // let csvData = [dataProfile]
            //
            // try{
            //     csvData.push(await getArtistData('Boolin'))
            // }catch(e){
            // }
            //
            // try{
            //     csvData.push(await getArtistData('Joya Mooi'))
            // }catch(e){
            // }
            // console.log(csvData)
            // csvWriter
            //     .writeRecords(csvData)
            //     .then(()=> console.log('Data uploaded into csv successfully'));
        })
});

//gets danceability, energy and acousticness for each of the top 50 songs of a user
async function getsongInfo(){
    let dataSpots = [];
    let data = await spotifyApi.getMyTopTracks({limit: 50})
    for(let i = 0; i < data.body.total; i++){
        let songData = await spotifyApi.getAudioFeaturesForTrack(data.body.items[i].id)
        let songInfo = [songData.body.energy, songData.body.danceability, songData.body.acousticness]
        dataSpots.push(songInfo)
    }
    return dataSpots
}

async function getSingleInfo(){
    let data = await spotifyApi.getMyTopTracks({limit: 1})
    let songData = await spotifyApi.getAudioFeaturesForTrack(data.body.items[0].id)
    return songData
}

//gets top 50 artists of the user
async function getArtists(){
    let artists = []
    let data = await spotifyApi.getMyTopArtists({limit : 50})

    for(let i = 0; i < data.body.total; i++){
        artists.push(data.body.items[i].name)
    }
    return artists
}

//gets the genres associated with the top 50 artists of the user
async function getGenres(){
    let genres = []
    let data = await spotifyApi.getMyTopArtists({limit : 50})
    for(let i = 0; i < data.body.total; i++) {
        data.body.items[i].genres.forEach(genre => {
            genres.push(genre)
        })
    }
    return genres
}

async function getArtistData(artistName) {
    let APIQuery = await spotifyApi.searchArtists(artistName)
    let data = APIQuery.body.artists.items[0]

    let albums = await spotifyApi.getArtistAlbums(data.id)

    let artistTracks = []

    let trackData = []

    for(let i = 0; i < albums.body.items.length; i++){
        if(albums.body.items[i].album_type === 'album'){
            let tracks=  await spotifyApi.getAlbumTracks(albums.body.items[i].id)
            for(let j = 0; j < tracks.body.items.length; j++){
                artistTracks.push(tracks.body.items[j].id)
            }

            for(let k = 0; k < artistTracks.length; k++){
                try{
                    let data = await spotifyApi.getAudioFeaturesForTrack(artistTracks[k])
                    let dataSpot = [data.body.energy, data.body.danceability, data.body.acousticness]
                    trackData.push(dataSpot)
                }catch (e){
                }
            }
        }
    }
    let artistProfile = {
        artists: artistName,
        genres: data.genres,
        dataSpots: trackData
    }

    return artistProfile
}

function getMatchAverageDistance(spots, centroids){
    centroids.forEach(centroid => {
        let distances = []
        spots.forEach(spot => {
            let distance = Math.sqrt(((spot[0]-centroid.centroid[0])**2) + ((spot[1]-centroid.centroid[1])**2) + ((spot[2]-centroid.centroid[2])**2))
            distances.push(distance)
        })
        let getAverage = (distances) => distances.reduce((a, b) => a + b, 0) / distances.length
        let avg
        if(distances.length > 0){
            avg = getAverage(distances)
        }else{
            console.log("no data found")
        }
        centroid.avgDistance = avg
    })
    centroids.sort((a, b) => (a.avgDistance > b.avgDistance) ? 1 : -1)
    return centroids
}

//
app.listen(8888, () =>
    console.log(
        'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
    )
);
