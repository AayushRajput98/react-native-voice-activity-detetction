import { StatusBar } from 'expo-status-bar';
import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  PermissionsAndroid,
  ToastAndroid,
  ActivityIndicator
} from 'react-native';
import { WHITE, GRADBLUE, GREEN, GRADRED } from './utils/COLORS';
import LinearGradient from 'react-native-linear-gradient';
import Icon  from 'react-native-vector-icons/FontAwesome';

import LiveAudioStream from 'react-native-live-audio-stream'; //The main library
import { Buffer } from 'buffer';

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
          if (granted === PermissionsAndroid.RESULTS.GRANTED){
              //console.log("You can now perform audio recording.")
          }
          else{
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
        if (granted === PermissionsAndroid.RESULTS.GRANTED){
           // console.log("You can use storage.")
        }
        else{
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
          if (granted === PermissionsAndroid.RESULTS.GRANTED){
              //console.log("You can use storage.")
          }
          else{
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

export default function App() {
  const [recording, setRecording] = useState(false);
  const [voiceActivity, setVoiceActivity] = useState(false);

  const options = {
    sampleRate: 32000,  // default is 44100 but 32000 is adequate for accurate voice recognition
    channels: 1,        // 1 or 2, default 1
    bitsPerSample: 16,  // 8 or 16, default 16
    audioSource: 6,     // android only (see below)
    bufferSize: 4096    // default is 2048
  };
  
  LiveAudioStream.init(options);
  LiveAudioStream.on('data', data => {
    var chunk = Buffer.from(data, 'base64');
    console.log(chunk)
  });

   //As the value of recording changed we will start or stop the recording
   useEffect(() => {
    console.log("Recording value(useEffect): ", recording)
    if (recording){
      console.log("Start..")
      LiveAudioStream.start()
    }
    else{
      console.log("..Stop")
      LiveAudioStream.stop()
    }
  }, [recording])

  useEffect(() => {
    askPermission();
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
