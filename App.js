import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  PermissionsAndroid,
} from 'react-native';
import { WHITE, GRADBLUE, GREEN, GRADRED } from './utils/COLORS';
import LinearGradient from 'react-native-linear-gradient';
import Icon  from 'react-native-vector-icons/FontAwesome';

import AudioRecord from 'react-native-audio-record';
import { Buffer } from 'buffer';
import createBuffer from 'audio-buffer-from'
import * as wav from 'node-wav';
import RNFetchBlob from 'rn-fetch-blob'
import util from 'audio-buffer-utils'
const toWav = require('audiobuffer-to-wav')
const { decode, encode } = require('base64-arraybuffer');


//Record and storage permission Permissions..
async  function askPermission(){
  if(Platform.OS === 'android'){
      try{
          const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
              title: 'Permission request to use audio',
              message: 'Give permission to use auido to record',
              buttonPositive: 'OK'
          });
          if (granted !== PermissionsAndroid.RESULTS.GRANTED){
              console.log("Permission Denied.")
              return;
          }
      }
      catch(e){
          console.warn("Permission Error: ", e)
          return;
      }
  }

  if(Platform.OS === 'android'){
    try{
        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE, {
            title: 'Permission to read storage',
            message: 'Give permission to use storage to read',
            buttonPositive: 'OK'
        });
        if (granted !== PermissionsAndroid.RESULTS.GRANTED){
            console.log("Permission Denied.")
            return;
        }
    }
    catch(e){
        console.warn("Permission Error: ", e)
        return;
    }
}

  if(Platform.OS === 'android'){
      try{
          const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE, {
              title: 'Permission to write storage',
              message: 'Give permission to use storage to write',
              buttonPositive: 'OK'
          });
          if (granted !== PermissionsAndroid.RESULTS.GRANTED){
              console.log("Permission Denied.")
              return;
          }
      }
      catch(e){
          console.warn("Permission Error: ", e)
          return;
      }
  }
}

var startTime = null; //Record the time till the voice activity is detected. 
var trimTime = null;
var endTime = null;

export default function App() {
  const [recording, setRecording] = useState(false);
  const [doVad, setDoVad] = useState(true);

  var fdata = new Float32Array(1024);
  /*  ----- VAD variables ----- */
  var baseLevel = 0;
  var voiceScale = 1;
  var activityCounter = 0;
  var activityCounterMin = 0;
  var activityCounterMax = 60;
  var activityCounterThresh = 5;

  var envFreqRange = [];
  var isNoiseCapturing = true;
  var prevVadState = undefined;
  var vadState = false;
  var captureTimeout = null;
  /*  ----- VAD variables ----- */

  //Clipping algorithm.
  const clipAudio = async (filePath) => {
    const audioAsBase64 = await RNFetchBlob.fs.readFile(filePath, 'base64');
    let audioBuffer = Buffer.from(audioAsBase64, 'base64')
    const audioData = createBuffer(audioBuffer, 'int16 48000')

    let totalDuration = audioData.length
    let soundDuration = endTime - startTime

    let trimDuration = Math.floor((totalDuration / soundDuration) * (trimTime-500) )
    console.log(`Total Duration: ${totalDuration}, Sound Duration: ${soundDuration}, Trim Time: ${trimTime}`)
    
    const slicedAudio = util.slice(audioData, trimDuration, totalDuration)
    const slicedAudioWav = toWav(slicedAudio)
    const slicedAudioto64Str = encode(slicedAudioWav)

    // write the file
    var RNFS = require('react-native-fs');
    var path = RNFS.ExternalStorageDirectoryPath + '/trim.wav';
    RNFS.writeFile(path, slicedAudioto64Str, 'base64')
    .then((success) => {
      console.log('FILE WRITTEN!');
    })
    .catch((err) => {
      console.log(err.message);
    });
  }

  const onStart = async () => {
      console.log("..... Recording Started .....") 
      AudioRecord.start();
  }
  
  const onStop = async () =>{
      console.log("..... Recording Stopped .....") 
      endTime = Date.now()
      let uri = await AudioRecord.stop();
      clipAudio(uri)
  }

  function init(options){
    console.log('VAD: stop noise capturing');
    isNoiseCapturing = false;

    envFreqRange = envFreqRange.filter(function(val) {
      return val;
    }).sort();
    var averageEnvFreq = envFreqRange.length ? envFreqRange.reduce(function (p, c) { return Math.min(p, c) }, 1) : (options.minNoiseLevel || 0.1);

    baseLevel = averageEnvFreq * options.avgNoiseMultiplier;
    if (options.minNoiseLevel && baseLevel < options.minNoiseLevel) baseLevel = options.minNoiseLevel;
    if (options.maxNoiseLevel && baseLevel > options.maxNoiseLevel) baseLevel = options.maxNoiseLevel;

    voiceScale = 1 - baseLevel;

    console.log('VAD: base level:', baseLevel);
  }

  function analyseFrequency(sampleRate, frequencies, binCount) {
    //console.log(frequencies, sampleRate, binCount)
    const div = 255
    const minHz =  85         // in Hz
    const maxHz = 255   
    //var frequencyToIndex = require('audio-frequency-to-index')
    //console.log(start, end)
    var start = 0
    var end = 512
    var count = end - start
    var sum = 0
    for (; start < end; start++) {
      sum += frequencies[start] / div
    }
    //console.log("Return: ", count === 0 ? 0 : (sum / count))
    return count === 0 ? 0 : (sum / count)
  }

  function voiceActivityDetection(freq, options) {
    //console.log(freq)
    var average = analyseFrequency(options.sampleRate, freq, options.frequencyBinCount);
    //console.log("Average: ", average)
    
    if (isNoiseCapturing) {
      envFreqRange.push(average);
      return;
    }
    
    if (average >= baseLevel && activityCounter < activityCounterMax) {
      activityCounter++;
    } else if (average < baseLevel && activityCounter > activityCounterMin) {
      activityCounter--;
    }

    vadState = activityCounter > activityCounterThresh;
    //console.log(vadState)

    if (prevVadState !== vadState) {
      vadState ? voiceDetected() : console.log("Voice Stop");
      prevVadState = vadState;
    }

    //console.log(Math.max(0, average - baseLevel) / voiceScale);

  }

  function voiceDetected() {
    trimTime = Date.now() - startTime; // Time to pass to the clipAudioFunciton
    console.log("Voice Active...")
    setDoVad(false);
    setTimeout(
      () => {
        setRecording(!recording)
      }, 
      500
    )
  }

  function getByteFrequencyData(audioData, options, bufferSize){

      var fft = require('ndarray-fft');
      var ndarray = require('ndarray');
      var db = require('decibels/from-gain');
      var blackman = require('scijs-window-functions/blackman');
      
      let channelData = audioData['_channelData'][0]

      var input = channelData.slice(-options.fftSize);

      //Step1: Blackman Window 
      for (var i = 0; i < options.fftSize; i++) {
        input[i] *= blackman(i, options.fftSize);
      }

      //create complex parts
      var inputRe = ndarray(input);
      var inputIm = ndarray(new Float32Array(options.fftSize));

      //Step2: Fast Fourier Transform
      var fft = require("fft-js").fft
      var intermediate = fft(input)

      //Step3: Smoothing
      var k = Math.min(1, Math.max(options.smoothingTimeConstant, 0));

      for (var i = 0; i < options.fftSize; i++) {
        fdata[i] = k* fdata[i] + (1 - k) * Math.abs(intermediate[i][0]) / options.fftSize;
      }

      //console.log(fdata)

      var _fdata = new Float32Array(options.fftSize)

      //Step3: Convert to db
      for (var i = 0; i < options.fftSize; i++) {
        _fdata[i] = db(fdata[i])
      }

      //console.log(_fdata)

      var arr = new Uint8Array(options.frequencyBinCount)

      //Step4: getByteFrequency
      var minDb = options.minDecibels, maxDb = options.maxDecibels;
      var rangeScaleFactor =  1 / (maxDb - minDb);
      //console.log(rangeScaleFactor)
      for (var i = 0; i < 512; i++) {
        var mg = Math.max(db(fdata[i]), minDb);

        var scaledValue = 255 * (mg - minDb) * rangeScaleFactor;
        
        //console.log(scaledValue)
        arr[i] = scaledValue;
      }
      return arr

  }

   //As the value of recording changed we will start or stop the recording
   useEffect(() => {
    if (recording){

      const options = {
        sampleRate: 48000,  // default 44100
        channels: 1,        // 1 or 2, default 1
        bitsPerSample: 16,  // 8 or 16, default 16
        audioSource: 9,     // android only (see below)
        wavFile: 'test.wav' // default 'audio.wav'
      };

      const analyserOptions = {
        sampleRate: options.sampleRate,
        channel: 0,
        channels: 1,
        fftSize: 1024, //if you change it here remeber to change the defination of fdata
        minDecibels: -100,
        maxDecibels: -30,
        frequencyBinCount: 512,
        smoothingTimeConstant: 0.2,
        noiseCaptureDuration: 1000,
        minNoiseLevel: 0.3,         // from 0 to 1
        maxNoiseLevel: 0.7,         // from 0 to 1
        avgNoiseMultiplier: 1.2,
      };

      
      if (isNoiseCapturing) {
        console.log('VAD: start noise capturing');
        captureTimeout = setTimeout(init, analyserOptions.noiseCaptureDuration, analyserOptions);
      }

      AudioRecord.init(options);

      AudioRecord.on('data', data => {
        try{
          var chunk = Buffer.from(data, 'base64'); 
          var audioData = createBuffer(chunk, 'int8 48000')
          var frequencies = getByteFrequencyData(audioData, analyserOptions, audioData['_channelData'][0].length)
          
          //Once voice activity is detected lets stop the vad procedure. 
          if (doVad){
            voiceActivityDetection(frequencies, analyserOptions)          
          }
        }
        catch(e){
          console.error(e)
          onStop()
        }     
        });
      
      startTime = Date.now()
      onStart()
    }
    else{
      onStop()
      endTime = Date.now()
    }
  }, [recording])

  useEffect(() => {
    askPermission()
  }, [])


  return (
    <View style={styles.container}>
      <View style={styles.vadContainer}> 
        <Text style={styles.voiceActivity}>We will show the voice activity detection here.</Text>
      </View>
      <View style={styles.recordButtonContainer}>
        {/* Make this to toggle betweeen recording and recorded state */}
        <TouchableOpacity activeOpacity={1} onPress={() => { setRecording(!recording) }}>
          <LinearGradient colors={(recording)? GRADRED : GRADBLUE} style={styles.recordButton}>
              <Text style={styles.recordText}>
              {(recording)?
                    <Icon name="stop" size={25} color={WHITE}/>:
                    <Icon name="microphone" size={30} color={WHITE}/>
                  }
              </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ScreenWidth = Dimensions.get('window').width
const ScreenHeight = Dimensions.get('window').height

const styles = StyleSheet.create({
  container: {
    backgroundColor: WHITE,
    flex: 1,
  }, 
  vadContainer: {
    flex: 0.7,    
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceActivity: {
    color: WHITE,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    width: ScreenWidth/1.5,
  },
  recordButtonContainer: {
    flex: 0.3,    
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButton: {
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 10,
    borderRadius: 150,
    width: 75,
    height: 75,
  },
  buttonText: {
    textAlign: 'center',
    color: WHITE
  }
});
