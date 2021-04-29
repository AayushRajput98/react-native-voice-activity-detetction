# Task at hand ~ Create a Voice Activity Detection / Pitch Detection Method:
## SubTasks
### Verify the following:-
[ ] Audio Data: Compare Audio Data namely the channel data from Web API and audio-buffer-form package.
[x] Multiple Recordings: Check if it is possible to have multiple recordings simultaneously.
[x] Compare node-wav decoder and audio-buffer-from. (Verified they give similar results)
[ ] Audio Data analysis compare with the web source 

totalDuration: Buffer Length
getMMSSFromMillis : ms => minutes:seconds
soundDuration: Time in milliSec startTime-endTime

I can do it like this: 
totalDuration => soundDuration
trimStart => (totalDuration / soundDuration) * trimTime
trimEnd = totalDuration.