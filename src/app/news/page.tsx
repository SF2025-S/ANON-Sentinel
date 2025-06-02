"use client"

import { useEffect, useState, useCallback } from "react";
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseconfig";

interface NewsItem {
  id: string;
  title: string;
  content: string;
  date: string;
  link?: string; 
}

export default function News() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [link, setLink] = useState(""); 
  const [news, setNews] = useState<NewsItem[]>([]);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNews = useCallback(async () => {
    const querySnapshot = await getDocs(collection(db, "news"));
    const newsData = querySnapshot.docs.map(doc => ({ 
      id: doc.id,
      ...doc.data()
    } as NewsItem));
    setNews(newsData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const addNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "news"), { 
        title, 
        content, 
        link,
        date: new Date().toISOString() 
      });
      setTitle("");
      setContent("");
      setLink("");
      await fetchNews();
    } catch (error) {
      console.log(error)
      alert("Erro ao adicionar notícia");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNews) return;
    setLoading(true);
    try {
      const newsRef = doc(db, "news", editingNews.id);
      await updateDoc(newsRef, {
        title: editingNews.title,
        content: editingNews.content,
        link: editingNews.link
      });
      setEditingNews(null);
      await fetchNews();
    } catch (error) {
      console.log(error)
      alert("Erro ao editar notícia");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta notícia?")) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, "news", id));
      await fetchNews();
    } catch (error) {
      console.log(error)
      alert("Erro ao excluir notícia");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">Notícias</h2>

        {editingNews ? (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-bold mb-4">Editar Notícia</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <input
                type="text"
                value={editingNews.title}
                onChange={(e) => setEditingNews({...editingNews, title: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="Título"
              />
              <textarea
                value={editingNews.content}
                onChange={(e) => setEditingNews({...editingNews, content: e.target.value})}
                className="w-full p-2 border rounded h-32"
                placeholder="Conteúdo"
              />
              <input
                type="url"
                value={editingNews.link || ''}
                onChange={(e) => setEditingNews({...editingNews, link: e.target.value})}
                className="w-full p-2 border rounded"
                placeholder="Link (opcional)"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNews(null)}
                  className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-bold mb-4">Adicionar nova notícia</h3>
            <form onSubmit={addNews} className="space-y-4">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Título"
                required
              />
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2 border rounded h-32"
                placeholder="Conteúdo"
                required
              />
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="Link (se aplicavel)"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {loading ? "Adicionando..." : "Adicionar Notícia"}
              </button>
            </form>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-bold mb-4">Notícias</h3>
          <div className="space-y-4">
            {news.map((item) => (
              <div key={item.id} className="border p-4 rounded">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold">{item.title}</h4>
                    <p className="text-gray-600 mt-2">{item.content}</p>
                    {item.link && (
                      <a 
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline mt-2 inline-block"
                      >
                        Ver mais
                      </a>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      {new Date(item.date).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingNews(item)}
                      className="bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}