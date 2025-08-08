import QtQuick 2.15
import QtQuick.Controls 2.15
import QtQuick.Layouts 1.15

RowLayout {
	id: quickChat
	anchors.fill: parent
	spacing: 0

	// FIXME: Window.getDarkThemePreference isn't accessible from QML
	property bool darkMode: true

	Button {
		id: cancelButton
		text: "×"
		palette.buttonText: quickChat.darkMode ? "white" : "black";
		font.pixelSize: 20
		Layout.fillHeight: true

		background: Rectangle {
			implicitWidth: 40
			implicitHeight: 40
			color: quickChat.darkMode ?
				(parent.pressed ? "#60001d" : "#7c1534") :
				(parent.pressed ? "#e2b1be" : "#eac7d0")
			border.color: quickChat.darkMode ? "#4c0016" : "#bf7689"
		}

		onClicked: {
			toScript({ action: "close" });
		}
	}

	TextField {
		id: chatInput
		placeholderText: "Quick chat message…"
		placeholderTextColor: quickChat.darkMode ? "#606060" : "#808080";
		color: quickChat.darkMode ? "white" : "black";
		focus: true

		font.pixelSize: 20

		Layout.fillWidth: true
		Layout.fillHeight: true

		background: Rectangle {
			color: quickChat.darkMode ? "#2f2b3d" : "#eeeeee";
			border.color: quickChat.darkMode ? "#1d192b" : "#aaaaaa";
		}

		onTextChanged: {
			if (chatInput.text.length === 0) {
				toScript({ action: "stop_typing" });
			} else {
				toScript({ action: "start_typing" });
			}
		}

		Keys.onPressed: {
			if (
				chatInput.text.length !== 0 &&
				(event.key === Qt.Key_Return || event.key === Qt.Key_Enter)
			) {
				sendButton.clicked();
			}
		}
	}

	Button {
		id: sendButton
		text: "»"
		font.pixelSize: 20
		palette.button: quickChat.darkMode ? "#2f2b3d" : "#eeeeee";
		palette.buttonText: quickChat.darkMode ? "white" : "black";
		Layout.fillHeight: true

		background: Rectangle {
			implicitWidth: 40
			implicitHeight: 40
			color: parent.pressed ? 
				(quickChat.darkMode ? "#252135" : "#aaaaaa") :
				(quickChat.darkMode ? "#2f2b3d" : "#eeeeee")
			border.color: quickChat.darkMode ? "#1d192b" : "#aaaaaa";
		}

		onClicked: {
			toScript({ action: "send", text: chatInput.text });
		}
	}

	function toScript(msg) {
		eventBridge.emitWebEvent(JSON.stringify(msg));
	}
}
