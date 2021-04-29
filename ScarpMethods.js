

async function nodeWavComparision(filePath){
  // const RNFS = require('react-native-fs');
  // const filePath = RNFS.ExternalStorageDirectoryPath + `/1617625365862.wav`;
  const audioAsBase64 = await RNFetchBlob.fs.readFile(filePath, 'base64');
  audioBuffer = Buffer.from(audioAsBase64, 'base64')
  const audioData = wav.decode(audioBuffer);
  console.log("AudioData from node-wav: ", audioData)
}



//Method 1: Only need for a complete audio
  const aggregrateChannelData = async (channelData) => {
  
    const meanOfChannels = tf.tidy(() => {
      return tf.tensor(channelData).mean(0);
    });
    const meanOfChannelsArray = await meanOfChannels.array();
    console.log(meanOfChannelsArray)
    // CLEAN-UP
    meanOfChannels.dispose();
    return meanOfChannelsArray;
  };



  //Method 2
  const truncateSamples = (
    samples,
    windowSize,
    strideSize,
  ) => {
    const truncate_size = (samples.length - windowSize) % strideSize;
  
    samples = samples.slice(0, samples.length - truncate_size);
  
    return samples;
  };
  


  //Method 3
  const getStridedSamples = ( samples, windowSize, strideSize,) => {
    // implements stride trick
    const rows = windowSize;
    const cols = Math.floor((samples.length - windowSize) / strideSize) + 1;
    const step_size = strideSize;
  
    let windowsArray = new Array(rows);
    for (let row = 0; row < rows; row++) {
      windowsArray[row] = new Array(cols);
      for (let col = 0; col < cols; col++) {
        windowsArray[row][col] = samples[row + step_size * col];
      }
    }
    return tf.tensor2d(windowsArray);
  };



  //Method 4:
  const generateHannWindow = (windowLength) => {
    /* Returns a set of values
        Reference: https://numpy.org/doc/stable/reference/generated/numpy.hanning.html
        */
    return tf.tidy(() => {
      // cos((2*pi*n)/(M-1)) for 0 <= n <= (M-1)
      const rangeTensor = tf.range(0, windowLength, 1, 'int32');
      const x = rangeTensor.mul(2 * Math.PI).div(windowLength - 1);
  
      // 0.5 * (1 - cos(x))
      const cosX = x.cos();
      const one = tf.scalar(1);
      let res = tf.scalar(0.5).mul(one.sub(cosX));
  
      res = res.expandDims(1);
  
      return res;
    });
  };



  //Method 5
  const performFFT = (
    windows,
    weighting,
    windowSize,
  ) => {
    return tf.tidy(() => {
      const windowsXweighting = windows.mul(weighting);
      const fft = windowsXweighting.transpose().rfft().abs().square().transpose();  
      return fft;
    });
  };

  const getFrequencies = async (sampleRate, audioBuffer) => {
    const strideInMillisec = 10.0
    const windowInMillisec = 20.0 

    maxFreq =  Math.round(sampleRate/2);

    const strideSize = Math.trunc(0.001 * sampleRate * strideInMillisec);
    const windowSize = Math.trunc(0.001 * sampleRate * windowInMillisec);

    let channelData = audioBuffer;

    
    const windows = getStridedSamples(channelData, windowSize, strideSize);

    const weighting = generateHannWindow(windowSize);

    const freqs = performFFT(channelData, weighting, windowSize);

    console.log(`fft result shape: ${freqs.shape}`)
    console.log(freqs)
  }



  
  const lvOptions = {
    sampleRate: 32000,  // default is 44100 but 32000 is adequate for accurate voice recognition
    channels: 1,        // 1 or 2, default 1
    bitsPerSample: 16,  // 8 or 16, default 16
    audioSource: 6,     // android only (see below)
    bufferSize: 4096    // default is 2048
  };
  
  LiveAudioStream.init(lvOptions);

  LiveAudioStream.on('data', data => {
    var chunk = Buffer.from(data, 'base64');
    console.log("Live Audio")
  });



  //console.log(audioBuffer.length) //Buffer Size: 2560???
        //const sampleRate = options.sampleRate;
        //console.log(`Audio Buffer: ${audioBuffer[0]} & ${audioBuffer[audioBuffer.length-1]}`)
        //var intermediate = fft(audioBuffer)
        //console.log(`Intermediate: ${intermediate[0]} & ${intermediate[intermediate.length-1]}`)
        //var freqs = fftUtil.fftMag(intermediate, options.sampleRate)
        //console.log(`Frequencies: ${freqs[0]} & ${freqs[freqs.length-1]}`)
        //getFrequencies(sampleRate, audioBuffer)



        var audioData = createBuffer(chunk, 'int8 le mono 48000')
        var fft = require("fft-js").fft
        var audioBuffer = Array.prototype.slice.call(audioData['_channelData'][0]).slice(0, 1024);
        var intermediate = fft(audioBuffer.slice(0, 1024))

        var db = require('decibels/from-gain');

        var magnitudes = intermediate.map(function(r){
          return (0.8)*Math.abs(r[0])/1024
        }) 

        //console.log(magnitudes)
        var freq = new Uint8Array(512)
        const minDecibels = -100
        const maxDecibels = -30
        var minDb = minDecibels, maxDb = maxDecibels;
        var rangeScaleFactor = maxDb === minDb ? 1 : 1 / (maxDb - minDb);
      
        for (var i = 0, l = Math.min(512, freq.length); i < l; i++) {

          //var mg = Math.max(db(magnitudes[i]), minDb);
          var scaledValue = 255 * (db(magnitudes[i]) - minDb) * rangeScaleFactor;
          freq[i] = scaledValue;
        }

        var both = magnitudes.map(function (m, ix) {
            return {frequencies: freq[ix], magnitude: m};
        });
        
        require('console.table')
        console.table(freq);


        function getByteFrequencyData(chunk, options){

          var pcm = require('pcm-util');
          var fft = require('ndarray-fft');
          var ndarray = require('ndarray');
          var db = require('decibels/from-gain');
          var blackman = require('scijs-window-functions/blackman');
          
          //get channel data converting the input
          var channelData = pcm.getChannelData(chunk, options.channel, pcm.defaultFormat).map(function (sample) {
            return pcm.convertSample(sample, pcm.defaultFormat, {float: true});
          });
      
          data = data.concat(channelData).slice(-options.bufferSize)
          
          fftCount += channelData.length;
      
          if(fftCount >= options.fftSize){
            fftCount = 0
      
            var input = data.slice(-options.fftSize);
      
            //Step1: Blackman Window 
            for (var i = 0; i < options.fftSize; i++) {
              input[i] *= blackman(i, options.fftSize);
            }
      
            //create complex parts
            var inputRe = ndarray(input);
            var inputIm = ndarray(new Float32Array(options.fftSize));
      
            //Step2: Fast Fourier Transform
            fft(1, inputRe, inputIm);
      
            //Step3: Smoothing
            var k = Math.min(1, Math.max(options.smoothingTimeConstant, 0));
      
            for (var i = 0; i < options.fftSize; i++) {
              fdata[i] = k* fdata[i] + (1 - k) * Math.abs(inputRe.get(i)) / options.fftSize;
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
          return null
        }


        export const trimmedSound = async (fileData, start, end, name) => {
          const decodeData = decode(fileData);  //use the buffer library for this. ==> directly use node-wav to get channel data from the wav file. [1]
          const arrayBufferTrim = decodeData;
          const audioBufferTrim = createBuffer(arrayBufferTrim, 'int32 le mono 44100');
          const firstSegment = util.slice(audioBufferTrim, 0, start);
          const lastSegment = util.slice(audioBufferTrim, end, audioBufferTrim.length);
          const finalize = util.concat(firstSegment, lastSegment);
          const slicedBuffer = util.slice(audioBufferTrim, start, end); //Then we need this part. [2]
          const slicedArrayBufferWav = toWav(slicedBuffer); //[3]
          const finalizeArrayBufferWav = toWav(finalize);
          const slicedBase64Str = encode(slicedArrayBufferWav); //[4]
          const finalizeStr = encode(finalizeArrayBufferWav);
          const duration = slicedBuffer.length; 
          const newFileUri = `${FileSystem.documentDirectory}${name}.wav`; //[5]
        
          //Replace this with a file write method of some sorts and return the URI of the same 
          //Use method from project 2 - wareHouse to do so. 
          try {
            await writeToTheNewFile(slicedBase64Str, newFileUri, duration, name);  
            return newFileUri;
          } catch (error) {
            console.warn(error);
          }
        };