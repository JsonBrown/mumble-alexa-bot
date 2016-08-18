const mumble = require('mumble');
const http = require('request');
const streamifier = require('streamifier');
const Speaker = require('speaker');
const config = require('./config/config.json');

var spkr = new Speaker({
    channels: 1,
    bitDepth: 16,
    sampleRate: 48000
});

var unique = Date.now() % 10;

mumble.connect(config.mumble, function( error, connection ) {
    if( error ) { throw new Error( error ); }
    var recording = false;
    var buffer = [];
    connection.authenticate('alexa');
    connection.on('initialized', () => {
        connection.outputStream().on('data', (b) => {
            if(recording) buffer.push(b);
        }).pipe(spkr);
    });
    connection.on('voice-start', (user) => {
        if(!recording) {
            recording = true;
            console.log(`${user.name} is talking`);
        }
    });
    connection.on('voice-end', (user) => {
        if(recording) {
            recording = false;
            if(buffer.length > 30) {
                // we don't want empty recordings
                console.log(`${user.name} stopped talking`);
                ((_buffer) => {
                    streamifier.createReadStream(Buffer.concat(_buffer))
                        .pipe(http.post(config.alexa))
                        .pipe(connection.inputStream());
                })(buffer);
            }
            buffer = [];
        }
    });
});

