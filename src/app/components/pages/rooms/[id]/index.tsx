import 'firebase/firestore'
import firebase from 'firebase/app'
import { Button } from 'antd'
import { useEffect, useContext, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/router'
import { GlobalContext } from 'components/App'
import { Maybe, User } from 'resources'

type Props = {
  id: string
}

export const Room: React.FC<Props> = ({ id }) => {
  const router = useRouter()
  const { user } = useContext(GlobalContext)
  const [room, setRoom] = useState<Maybe<firebase.firestore.DocumentData>>(null)
  const [participants, setParticipants] = useState<User[]>([])
  useEffect(() => {
    const db = firebase.firestore()
    db.collection('rooms')
      .doc(id)
      .onSnapshot(doc => {
        const data = doc.data()
        if (data) {
          setRoom(data)
        }
      })
    db.collection('rooms')
      .doc(id)
      .collection('participants')
      .onSnapshot(async snapshot => {
        const userDocs = await Promise.all(snapshot.docs.map(doc => doc.data()))
        const users = await Promise.all(userDocs.map(doc => doc.user.get()))
        setParticipants(users.map(u => u.data()))
      })
  }, [])
  const isHost = useMemo(() => {
    if (user && room) {
      return user.uid === room.host
    } else {
      return false
    }
  }, [user, room])
  const join = useCallback(() => {
    if (!user) {
      return
    }
    const db = firebase.firestore()
    const userRef = db.collection('users').doc(user.uid)
    db.collection('rooms')
      .doc(id)
      .collection('participants')
      .add({
        user: userRef,
        order: Math.random()
      })
  }, [user])
  const isJoined = useMemo(
    () =>
      participants.some(u => {
        if (!user) {
          return false
        }
        return u.uid === user.uid
      }),
    [user, participants]
  )
  const createRound = useCallback(async () => {
    const db = firebase.firestore()
    const roomRef = db.collection('rooms').doc(id)
    const parentQuery = await roomRef
      .collection('participants')
      .orderBy('order')
      .limit(1)
      .get()
    const doc = await roomRef.collection('rounds').add({
      parent: parentQuery.docs[0].data()
    })
    router.push(`/rooms/${id}/rounds/${doc.id}`)
  }, [])
  return (
    <div>
      <div>{isHost ? 'あなたはホストです' : 'あなたは参加者です'}</div>
      <div>
        {!isJoined && (
          <Button type="primary" onClick={join}>
            参加する
          </Button>
        )}
      </div>
      <div>参加者を待っています...</div>
      <div>
        参加者:&nbsp;
        {participants.map(u => (
          <span key={u.uid}>{u.name},&nbsp;</span>
        ))}
      </div>
      {isHost && (
        <div>
          <Button type="primary" onClick={createRound}>
            ラウンドをスタート
          </Button>
        </div>
      )}
    </div>
  )
}