window.onload = function () {
  if (window.location.hash == '') {

  } else {
    var data = window.location.hash.substring(1).split("&");
    var code = data[0];
    var pass = data[1];
    if (pass == undefined) {
      pass = "";
    }
    document.querySelector("#joinRoomCode").value = code;
    document.querySelector("#joinRoomPass").value = pass;
  }
}


wait(1500).then(() => {
  document.getElementById("main").style.display = "flex";
  document.getElementById("splash").style.display = "none";
});

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createClose() {
  document.getElementById("create-room").style.display = "none";
  document.getElementById("create-room").classList.toggle = "active";
}
function createOpen() {
  document.getElementById("create-room").style.display = "flex";
  document.getElementById("create-room").classList.toggle = "active";
}
function joinCall() {
  var code = document.querySelector("#joinRoomCode").value;
  var pass = document.querySelector("#joinRoomPass").value;
  if (code.length == 0) {
    document.querySelector('#alert-text').textContent = 'Please Enter Valid Room Code';
    document.querySelector('.alert').classList.toggle('alertnow');
    document.querySelector('#joinRoomCode').classList.toggle('emptyRoomInput');
    wait(3000).then(() => {
      document.querySelector('.alert').classList.toggle('alertnow');
      document.querySelector('#joinRoomCode').classList.toggle('emptyRoomInput');

    });

  } else {
    if (pass.length == 0) {
      document.querySelector('#alert-text').textContent = 'Please Enter Secret Code';
      document.querySelector('.alert').classList.toggle('alertnow');
      document.querySelector('#joinRoomPass').classList.toggle('emptyRoomInput');
      wait(3000).then(() => {
        document.querySelector('.alert').classList.toggle('alertnow');
        document.querySelector('#joinRoomPass').classList.toggle('emptyRoomInput');
      });
    } else {
      //check firebase
      db.ref("rooms").orderByChild("code").equalTo(code).once("value", (snap) => {
        var data = snap.val();
        if (data == null) {
          document.querySelector('#alert-text').textContent = 'Please Enter valid Room Code';
          document.querySelector("#joinRoomCode").value = "";
          document.querySelector("#joinRoomPass").value = "";
          document.querySelector('.alert').classList.toggle('alertnow');
          wait(3000).then(() => {
            document.querySelector('.alert').classList.toggle('alertnow');
          });
        } else {
          if (data[code].secret == pass) {
            document.querySelector("#roomNameDetail").innerText = data[code].name;
            document.querySelector("#roomCodeDetail").innerText = data[code].code;
            document.querySelector("#roomSecretDetail").innerText = data[code].secret;
            document.querySelector(".dialer").style.display = "none";
            document.querySelector(".callui").style.display = "flex";
            document.querySelector("#header").classList.toggle("callactive");
            startCall(code, pass);
          } else {
            document.querySelector('#alert-text').textContent = 'Please Enter Correct Secret Code';
            document.querySelector("#joinRoomPass").value = "";
            document.querySelector('.alert').classList.toggle('alertnow');
            wait(3000).then(() => {
              document.querySelector('.alert').classList.toggle('alertnow');
            });
          }
        }

      });

    }

  }
}
var connStatus;
function createCall() {
  var roomName = document.querySelector("#createRoomName").value;
  var roomCode = document.querySelector("#createRoomCode").value;
  if (roomName.length == 0) {
    document.querySelector('#alert-text').textContent = 'Please Enter Your Room Name';
    document.querySelector('.alert').classList.toggle('alertnow');
    wait(3000).then(() => {
      document.querySelector('.alert').classList.toggle('alertnow');
    });
  } else if (roomCode.length == 0) {
    document.querySelector('#alert-text').textContent = 'Please Enter Your Room Code';
    document.querySelector('.alert').classList.toggle('alertnow');
    wait(3000).then(() => {
      document.querySelector('.alert').classList.toggle('alertnow');
    });
  } else {
    var secretCode = Math.floor(100000 + Math.random() * 900000);
    db.ref("rooms/" + roomCode + "/").set({
      name: roomName,
      code: roomCode,
      secret: secretCode
    });
    document.querySelector("#roomNameDetail").innerText = roomName;
    document.querySelector("#roomCodeDetail").innerText = roomCode;
    document.querySelector("#roomSecretDetail").innerText = secretCode;
    document.querySelector(".dialer").style.display = "none";
    document.querySelector(".callui").style.display = "flex";
    document.querySelector("#header").classList.toggle("callactive");
    connStatus = "created";
    startCall(roomCode, secretCode);
  }
}
function endCall() {
  var code = document.querySelector("#roomCodeDetail").innerText;
  if (connStatus == "created") {
    db.ref('rooms').child(code).remove();
  }
  window.location.hash = '';
  window.location.reload();
}
//Share Menu
document.querySelector('.shareBtn').addEventListener('click', event => {
  if (navigator.share) {
    const URL = window.location;
    navigator.share({
      title: 'Duet-Private Chat Room',
      url: URL
    });
  } else {
    // fallback
  }
});
// Full screen
document.querySelector(".full_scr").addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.querySelector(".full_scr span").innerText = 'fullscreen';
    document.exitFullscreen();
  } else {
    document.querySelector(".full_scr span").innerText = 'close_fullscreen';
    document.querySelector("#main").requestFullscreen();
  }
})

function startCall(code, secretCode) {
  location.hash = code + "&" + secretCode;
  const roomHash = location.hash.substring(1);
  // TODO: Replace with your own channel ID
  const drone = new ScaleDrone('xZB83GgHrdgCjKJJ');
  // Room name needs to be prefixed with 'observable-'
  const roomName = 'observable-' + roomHash;
  const configuration = {
    iceServers: [{
      urls: 'stun:stun.l.google.com:19302'
    }]
  };
  let room;
  let pc;


  function onSuccess() { };
  function onError(error) {
    console.error(error);
  };


  drone.on('open', error => {
    if (error) {
      return console.error(error);
    }
    room = drone.subscribe(roomName);
    room.on('open', error => {
      if (error) {
        onError(error);
      }
    });
    // We're connected to the room and received an array of 'members'
    // connected to the room (including us). Signaling server is ready.
    room.on('members', members => {
      console.log('MEMBERS', members);
      // If we are the second user to connect to the room we will be creating the offer
      const isOfferer = members.length === 2;
      startWebRTC(isOfferer);
    });
  });

  // Send signaling data via Scaledrone
  function sendMessage(message) {
    drone.publish({
      room: roomName,
      message
    });
  }
  var localVideo;
  function startWebRTC(isOfferer) {
    pc = new RTCPeerConnection(configuration);




    // 'onicecandidate' notifies us whenever an ICE agent needs to deliver a
    // message to the other peer through the signaling server
    pc.onicecandidate = event => {
      if (event.candidate) {
        sendMessage({ 'candidate': event.candidate });
      }
    };

    // If user is offerer let the 'negotiationneeded' event create the offer
    if (isOfferer) {
      pc.onnegotiationneeded = () => {
        pc.createOffer().then(localDescCreated).catch(onError);
      }
    }
    pc.oniceconnectionstatechange = function () {
      if (pc.iceConnectionState == 'disconnected') {
        if (connStatus == "created") {

        }
        document.querySelector('#alert-text').textContent = 'User Left Room!';
        document.querySelector('.alert').classList.toggle('alertnow');
        wait(3000).then(() => {
          document.querySelector('.alert').classList.toggle('alertnow');
        });
        document.getElementById("remoteVideo").style.display = "none";
        document.querySelector(".remote .conn").style.display = 'flex';
        console.log('Disconnected');
      }
    }
    // When a remote stream arrives display it in the #remoteVideo element
    pc.ontrack = event => {
      const stream = event.streams[0];
      if (!remoteVideo.srcObject || remoteVideo.srcObject.id !== stream.id) {
        remoteVideo.srcObject = stream;
        document.getElementById("remoteVideo").style.display = "block";
        document.querySelector(".remote .conn").style.display = 'none';
      }
    };

    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    }).then(stream => {

      localVideo = stream;
      document.querySelector(".local .conn").style.display = 'none';

      document.getElementById("localVideo").srcObject = localVideo;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }, onError);


    // Listen to signaling data from Scaledrone
    room.on('data', (message, client) => {
      // Message was sent by us
      if (client.id === drone.clientId) {
        return;
      }

      if (message.sdp) {
        // This is called after receiving an offer or answer from another peer
        pc.setRemoteDescription(new RTCSessionDescription(message.sdp), () => {
          // When receiving an offer lets answer it
          if (pc.remoteDescription.type === 'offer') {
            pc.createAnswer().then(localDescCreated).catch(onError);
          }
        }, onError);
      } else if (message.candidate) {
        // Add the new ICE candidate to our connections remote description
        pc.addIceCandidate(
          new RTCIceCandidate(message.candidate), onSuccess, onError
        );
      }
    });
  }
  function localDescCreated(desc) {
    pc.setLocalDescription(
      desc,
      () => sendMessage({ 'sdp': pc.localDescription }),
      onError
    );
  }

  let isVideo = true
  document.querySelector(".cam_on").addEventListener("click", () => {
    var btn = document.querySelector(".cam_on span");
    if (btn.innerHTML == "videocam") {
      btn.innerHTML = "videocam_off";
    } else {
      btn.innerHTML = "videocam";
    }
    isVideo = !isVideo;
    localVideo.getVideoTracks()[0].enabled = isVideo;
  });
  let isAudio = true
  document.querySelector(".mic_on").addEventListener("click", () => {
    var btn = document.querySelector(".mic_on span")
    if (btn.innerHTML == "mic") {
      btn.innerHTML = "mic_off";
    } else {
      btn.innerHTML = "mic";
    }
    isAudio = !isAudio;
    localVideo.getAudioTracks()[0].enabled = isAudio;
  });

}



