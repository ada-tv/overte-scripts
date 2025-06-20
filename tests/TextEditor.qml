import QtQuick 2.2
import QtQuick.Layouts 1.15
import QtQuick.Controls 2.15

Page {
	header: ToolBar {
		id: toolbar

		RowLayout {
			width: parent.width
			spacing: 6

			ToolButton {
				Layout.alignment: Qt.AlignRight
				text: "Load"
			}
			ToolButton {
				Layout.alignment: Qt.AlignRight
				text: "Save"
			}

			ToolSeparator {}

			Label {
				Layout.fillWidth: true
				Layout.leftMargin: 6
				text: "file.js"
			}
		}
	}

	ScrollView {
		anchors.fill: parent

		TextArea {
			font.family: "monospace"
		}
	}

	footer: RowLayout {
		spacing: 6

		Label {
			Layout.leftMargin: 6
			text: "Status bar"
		}
	}
}
