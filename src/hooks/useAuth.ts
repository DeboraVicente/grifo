import { useState, useEffect } from 'react'
import type { User } from 'firebase/auth'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: any) {
      setError(mapFirebaseError(e.code))
      throw e
    }
  }

  const signUp = async (nome: string, email: string, password: string) => {
    setError(null)
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(user, { displayName: nome })
      // Salva perfil no Firestore para busca por e-mail nas amizades
      await setDoc(doc(db, 'usuarios', user.uid), {
        nome,
        email: email.toLowerCase(),
        criadoEm: new Date().toISOString(),
      })
    } catch (e: any) {
      setError(mapFirebaseError(e.code))
      throw e
    }
  }

  const signOut = () => firebaseSignOut(auth)

  return { user, loading, error, signIn, signUp, signOut, setError }
}

function mapFirebaseError(code: string): string {
  const errors: Record<string, string> = {
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/email-already-in-use': 'Este e-mail já está em uso.',
    'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
  }
  return errors[code] || 'Ocorreu um erro. Tente novamente.'
}
