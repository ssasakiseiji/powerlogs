import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { Dumbbell } from '../components/Icons';

const Login = () => {
  const [isLoginView, setIsLoginView] = useState(true); // Controla si es Login o Registro
  const [isResetView, setIsResetView] = useState(false); // Controla si es vista de reseteo
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (isLoginView) {
      // Iniciar Sesión
      try {
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        setError('Error al iniciar sesión. Verifica tus credenciales.');
      }
    } else {
      // Registrar
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          setError('El correo electrónico ya está en uso.');
        } else if (err.code === 'auth/weak-password') {
          setError('La contraseña debe tener al menos 6 caracteres.');
        } else {
          setError('Error al registrar la cuenta.');
        }
      }
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage('Correo de restablecimiento enviado. Revisa tu bandeja de entrada.');
    } catch (err) {
      setError('No se pudo enviar el correo. Verifica que el email sea correcto.');
    }
  };

  if (isResetView) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-sm bg-gray-800 p-8 rounded-xl shadow-lg text-white">
          <h2 className="text-xl font-bold text-center mb-6">Restablecer Contraseña</h2>
          <form onSubmit={handleResetSubmit} className="space-y-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo electrónico"
              required
              className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            {message && <p className="text-green-400 text-sm text-center">{message}</p>}
            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            <button
              type="submit"
              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Enviar correo
            </button>
          </form>
          <button onClick={() => setIsResetView(false)} className="text-center text-sm text-gray-400 mt-6 w-full hover:text-white">
            Volver a inicio de sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm bg-gray-800 p-8 rounded-xl shadow-lg text-white">
        <div className="text-center mb-8">
          <Dumbbell className="mx-auto h-12 w-12 text-cyan-500" />
          <h1 className="text-2xl font-bold mt-4">PowerLogs</h1>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo electrónico"
            required
            className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            required
            className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
           <div className="text-right">
                <button
                    type="button"
                    onClick={() => { setIsResetView(true); setError(''); setMessage(''); }}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300"
                >
                    ¿Olvidaste tu contraseña?
                </button>
            </div>
          {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          <button
            type="submit"
            className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            {isLoginView ? 'Iniciar Sesión' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-6">
          {isLoginView ? '¿No tienes una cuenta?' : '¿Ya tienes una cuenta?'}
          <button
            onClick={() => setIsLoginView(!isLoginView)}
            className="font-semibold text-cyan-400 hover:text-cyan-300 ml-2"
          >
            {isLoginView ? 'Regístrate' : 'Inicia Sesión'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;