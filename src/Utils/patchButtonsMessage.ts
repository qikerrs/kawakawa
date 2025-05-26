/* eslint-disable camelcase */
import { proto } from '../../WAProto'


type buttonParamsJson = {
	display_text: string
	id: string
	url?: string
	merchant_url?: string
	copy_code?: string
	phone_number?: string
}


const createButton = (button: any) => {
	switch (button?.type) {
	case 'url':
		return {
			name: 'cta_url',
			buttonParamsJson: JSON.stringify({
				display_text: button?.buttonText?.displayText || '',
				id: button.id,
				url: button.url,
				disabled: false
			})
		}

	default:
		return {
			name: 'quick_reply',
			buttonParamsJson: JSON.stringify({
				display_text: button?.buttonText?.displayText || '',
				id: button.buttonId,
				disabled: false
			})
		}
	}
}

const createInteractiveButtonsFromButton = (buttons: any) => {
	const buttonsArray: any[] = []
	buttons?.map((button: any) => {
		buttonsArray.push(createButton(button))
	})
	return buttonsArray
}

const getType = (message: any) => {
	if(message.image || message.imageMessage) {
		return 'image'
	} else if(message.video || message.videoMessage) {
		return 'video'
	} else if(message.document || message.documentMessage) {
		return 'document'
	}

	return 'text'
}

const createHeader = (message: proto.Message.IButtonsMessage | null | undefined): proto.Message.InteractiveMessage.IHeader => {
	if(!message) {
		return {
			title: '',
			hasMediaAttachment: false
		}
	}


	let hasMedia = false
	const MediaType = getType(message) + 'Message'
	if(message.documentMessage || message.imageMessage || message.videoMessage) {
		hasMedia = true
	}

	const header = {
		title: hasMedia ? message[MediaType]?.caption : '',
		hasMediaAttachment: hasMedia,
		[MediaType]: message[MediaType]
	}
	return header

}

const convertInteractiveHeaderToTemplateMedia = (message: proto.Message.InteractiveMessage.IHeader): proto.Message.IImageMessage | proto.Message.VideoMessage | proto.Message.DocumentMessage | null => {
	if(message.hasMediaAttachment) {
		if(message.documentMessage) {
			return message.documentMessage
		} else if(message.imageMessage) {
			return message.imageMessage
		} else if(message.videoMessage) {
			return message.videoMessage
		}
	}

	return null
}

const convertButtonsToInteractive = (msg: proto.Message.IButtonsMessage) => {
	msg = JSON.parse(JSON.stringify(msg))
	const header = createHeader(msg)
	return {
		documentWithCaptionMessage: {
			message: {
				interactiveMessage: {
					footer: {
						text: msg?.footerText
					},
					body: {
						text: msg?.contentText
					},
					header,
					nativeFlowMessage: {
						buttons: createInteractiveButtonsFromButton(msg?.buttons ?? [])
					}
				}
			}
		}
	}
}

const createButtonsFromInteractive = (buttons: any): proto.Message.ButtonsMessage.IButton[] => {
	const buttonsArray: proto.Message.ButtonsMessage.IButton[] = []
	buttons?.map((button: any) => {
		return buttonsArray.push({
			buttonId: button?.buttonParamsJson?.id || '',
			buttonText: {
				displayText: button?.buttonParamsJson?.display_text || ''
			},
			type: 1,
		})
	})
	return buttonsArray
}

const createTemplateButtonsFromInteractive = (buttons: proto.Message.InteractiveMessage.NativeFlowMessage.INativeFlowButton[]): proto.IHydratedTemplateButton[] => {
	const buttonsArray: proto.IHydratedTemplateButton[] = []
	buttons?.map((button: proto.Message.InteractiveMessage.NativeFlowMessage.INativeFlowButton, index: number) => {
		if(button.name === 'quick_reply') {
			const quickReplyButton: buttonParamsJson = JSON.parse(button.buttonParamsJson!)
			const quick_reply_button: proto.HydratedTemplateButton.IHydratedQuickReplyButton = {
				displayText: quickReplyButton.display_text,
				id: quickReplyButton.id,
			}
			buttonsArray.push({ quickReplyButton: quick_reply_button, index:index + 1 })
		} else if(button.name === 'cta_url') {
			const ctaUrlButton: buttonParamsJson = JSON.parse(button.buttonParamsJson!)
			const cta_url_button: proto.HydratedTemplateButton.IHydratedURLButton = {
				displayText: ctaUrlButton.display_text,
				url: ctaUrlButton.url,
				//@ts-ignore


			}
			buttonsArray.push({ urlButton: cta_url_button, index:index + 1 })
		} else if(button.name === 'cta_copy') {
			const ctaCopyButton: buttonParamsJson = JSON.parse(button.buttonParamsJson!)
			const cta_copy_button: proto.HydratedTemplateButton.IHydratedURLButton = {
				displayText: ctaCopyButton.display_text,
				url: `https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=${ctaCopyButton.copy_code}`
			}
			buttonsArray.push({ urlButton: cta_copy_button, index:index + 1 })
		} else if(button.name === 'cta_call') {
			const ctaCallButton: buttonParamsJson = JSON.parse(button.buttonParamsJson!)
			const cta_call_button: proto.HydratedTemplateButton.IHydratedCallButton = {
				displayText: ctaCallButton.display_text,
				phoneNumber: ctaCallButton.phone_number
			}
			buttonsArray.push({ callButton: cta_call_button, index:index + 1 })
		}
	})
	return buttonsArray
}

const convertInteractiveToTemplate = (msg: proto.Message.IInteractiveMessage): proto.Message.TemplateMessage.IHydratedFourRowTemplate => {
	const media = convertInteractiveHeaderToTemplateMedia(msg.header!)
	const getMediaType = (header: proto.Message.InteractiveMessage.IHeader) => {
		if(header.hasMediaAttachment) {
			if(header.documentMessage) {
				return 'documentMessage'
			} else if(header.imageMessage) {
				return 'imageMessage'
			} else if(header.videoMessage) {
				return 'videoMessage'
			}
		}
	}

	const containsMedia = getMediaType(msg.header!)
	return {
		hydratedContentText: msg.body?.text || '',
		hydratedFooterText: msg.footer?.text || '',
		hydratedButtons: createTemplateButtonsFromInteractive(msg.nativeFlowMessage?.buttons ?? []),
		imageMessage: containsMedia === 'imageMessage' ? media : undefined,
		videoMessage: containsMedia === 'videoMessage' ? media : undefined,
		documentMessage: containsMedia === 'documentMessage' ? media : undefined


	}
}


const createInteractiveHeaderFromTemplate = (msg: proto.Message.ITemplateMessage): proto.Message.InteractiveMessage.IHeader => {
	const header = msg.hydratedTemplate?.imageMessage || msg.hydratedTemplate?.videoMessage || msg.hydratedTemplate?.documentMessage
	const hasMedia = !!header
	return {
		title: hasMedia ? header?.caption || '' : '',
		subtitle: '',
		hasMediaAttachment: hasMedia,
		imageMessage: msg.hydratedTemplate?.imageMessage,
		videoMessage: msg.hydratedTemplate?.videoMessage,
		documentMessage: msg.hydratedTemplate?.documentMessage
	}
}

const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateString(length) {
    let result = ' ';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

const createInteractiveButtonsFromTemplate = (buttons: proto.IHydratedTemplateButton[]): proto.Message.InteractiveMessage.NativeFlowMessage.INativeFlowButton[] => {
	const buttonsArray: proto.Message.InteractiveMessage.NativeFlowMessage.INativeFlowButton[] = []
	buttons?.map((button: proto.IHydratedTemplateButton) => {
		if(button.quickReplyButton) {
			const quickReplyButton: proto.HydratedTemplateButton.IHydratedQuickReplyButton = button.quickReplyButton
			const quick_reply_button: buttonParamsJson = {
				display_text: quickReplyButton.displayText || '',
				id: quickReplyButton.id || ''
			}
			buttonsArray.push({ name: 'quick_reply', buttonParamsJson: JSON.stringify(quick_reply_button) })
		} else if(button.urlButton) {
			const urlButton: proto.HydratedTemplateButton.IHydratedURLButton = button.urlButton
			// check if url contains https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code= then it is a copy button
			if(urlButton.url?.includes('https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=')) {
				const cta_copy_button: buttonParamsJson = {
					display_text: urlButton.displayText || '',
					id: generateString(9),
					copy_code: urlButton.url.split('https://www.whatsapp.com/otp/code/?otp_type=COPY_CODE&code=')[1]
				}
				buttonsArray.push({ name: 'cta_copy', buttonParamsJson: JSON.stringify(cta_copy_button) })

			} else {
				const cta_url_button: buttonParamsJson = {
					display_text: urlButton.displayText || '',
					url: urlButton.url || '',
					id: generateString(9),
					merchant_url: urlButton.url || '',
				}
				buttonsArray.push({ name: 'cta_url', buttonParamsJson: JSON.stringify(cta_url_button) })
			}
		} else if(button.callButton) {
			const callButton: proto.HydratedTemplateButton.IHydratedCallButton = button.callButton
			const cta_call_button: buttonParamsJson = {
				display_text: callButton.displayText || '',
				id: generateString(9),
				phone_number: callButton.phoneNumber || ''
			}
			buttonsArray.push({ name: 'cta_call', buttonParamsJson: JSON.stringify(cta_call_button) })
		}
	})
	return buttonsArray
}

const convertTemplateToInteractive = (msg: proto.Message.ITemplateMessage): proto.Message.IInteractiveMessage => {
	const header = createInteractiveHeaderFromTemplate(msg)
	return {
		footer: {
			text: msg.hydratedTemplate?.hydratedFooterText || '',
		},
		body: {
			text: msg.hydratedTemplate?.hydratedContentText || '',
		},
		header,
		nativeFlowMessage: {
			buttons: createInteractiveButtonsFromTemplate(msg.hydratedTemplate?.hydratedButtons || [])
		}
	}
}


const patchWebButtonsMessage = (msg: proto.IMessage): proto.IMessage => {
	if(msg.documentWithCaptionMessage?.message?.interactiveMessage) {

		const templateMessage = convertInteractiveToTemplate(msg.documentWithCaptionMessage.message.interactiveMessage)
		/*msg = {
			templateMessage: {
				fourRowTemplate: {},
				hydratedTemplate: templateMessage
			}
		}*/
		msg = {
			viewOnceMessage: {
				message: {
					messageContextInfo: {
						deviceListMetadataVersion: 2,
						deviceListMetadata: {},
					},
					templateMessage: {
						fourRowTemplate: {},
	
						hydratedTemplate: templateMessage
					}
				},
			},
		};
	}

	return msg
}

export const patchButtonsMessage = (msg: proto.IMessage, currentJid?: string | null): proto.IMessage => {
	const isMobile = !currentJid?.includes(':') || false

	if(!isMobile) {
		return patchWebButtonsMessage(msg)
	} else {
		if(msg.templateMessage) {
			msg = {
				viewOnceMessage: {
					message: {
						interactiveMessage: convertTemplateToInteractive(msg.templateMessage)
					}
				}
			}
		}
	}

	// need to patch sender Device

	return msg
}
