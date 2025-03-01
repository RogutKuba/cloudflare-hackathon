import {
  RiRobot3Line,
  RiUser5Line,
  RiUserLine,
  RiUserSmileLine,
} from '@remixicon/react';

interface ChatMessageProps {
  sender: 'AI' | 'CS';
  content: string;
}

export function ChatMessage({ sender, content }: ChatMessageProps) {
  const isAI = sender === 'AI';

  return (
    <div className={`flex gap-2 mb-4 ${isAI ? '' : 'justify-end'}`}>
      {isAI && (
        <div className='bg-primary rounded-full p-2 h-8 w-8 flex items-center justify-center text-xs'>
          <RiRobot3Line className='h-4 w-4 text-primary-foreground' />
        </div>
      )}
      <div
        className={`${
          isAI ? 'bg-primary/90' : 'bg-secondary/90'
        } rounded-lg p-3 max-w-[80%]`}
      >
        <p>{content}</p>
      </div>
      {!isAI && (
        <div className='bg-secondary rounded-full p-2 h-8 w-8 flex items-center justify-center text-xs'>
          <RiUser5Line className='h-4 w-4 text-secondary-foreground' />
        </div>
      )}
    </div>
  );
}
