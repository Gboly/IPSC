import ReactMarkdown from 'react-markdown';
export default function Md({ children }) {
  return <div className="md"><ReactMarkdown>{children || ''}</ReactMarkdown></div>;
}
