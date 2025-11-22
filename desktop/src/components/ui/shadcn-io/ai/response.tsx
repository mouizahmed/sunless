'use client'

import { cn } from '@/lib/utils'
import { HTMLAttributes, ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export type AIResponseProps = HTMLAttributes<HTMLDivElement> & {
  children: string
}

const CodeBlock = ({ inline, className, children }: { inline?: boolean; className?: string; children?: ReactNode }) => {
  if (inline) {
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono text-white/90">
        {children}
      </code>
    )
  }

  const match = /language-(\w+)/.exec(className || '')
  const language = match ? match[1] : undefined

  return (
    <pre className="my-3 overflow-x-auto rounded-lg border border-white/10 bg-black/40 p-4">
      <code className={cn('block text-xs font-mono text-white/95 whitespace-pre', language && `language-${language}`)}>
        {children}
      </code>
    </pre>
  )
}

export const Response = ({ children, className, ...props }: AIResponseProps) => {
  const content = typeof children === 'string' ? children : ''

  return (
    <div
      className={cn('max-w-none text-sm text-white/90 leading-relaxed markdown-body', className)}
      {...props}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code: CodeBlock,
          h1: ({ children }) => (
            <h1 className="text-xl font-semibold text-white mt-6 mb-3 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-white mt-5 mb-3 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-white mt-4 mb-2 first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-white mt-3 mb-2 first:mt-0">{children}</h4>
          ),
          p: ({ children }) => (
            <p className="my-2 leading-relaxed first:mt-0 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="my-2 pl-5 space-y-1 list-disc marker:text-white/60">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 pl-5 space-y-1 list-decimal marker:text-white/60">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-blue-400 underline decoration-blue-400/30 hover:decoration-blue-400 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          em: ({ children }) => (
            <em className="italic text-white/90">{children}</em>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-white/20 pl-4 my-3 italic text-white/70">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-white/10 my-6" />,
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-white/10">{children}</tr>,
          th: ({ children }) => (
            <th className="border border-white/20 px-4 py-2 text-left font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border border-white/20 px-4 py-2">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default Response
