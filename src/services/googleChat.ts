export interface ChatSpace {
  name: string; // e.g. "spaces/AAAAAAAA"
  displayName: string;
  type: 'SPACE' | 'GROUP_CHAT' | 'DIRECT_MESSAGE';
  spaceType?: string;
  description?: string;
}

export interface ChatMessage {
  name: string;
  sender?: {
    name: string;
    displayName: string;
    type?: string;
  };
  text?: string;
  createTime: string;
}

export const fetchSpaces = async (accessToken: string): Promise<ChatSpace[]> => {
  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `خطأ ${res.status}: فشل استرجاع غرف Google Chat`;
    throw new Error(message);
  }

  const data = await res.json();
  return data.spaces || [];
};

export const fetchMessages = async (accessToken: string, spaceName: string): Promise<ChatMessage[]> => {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=50`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `خطأ ${res.status}: فشل استرجاع الرسائل`;
    throw new Error(message);
  }

  const data = await res.json();
  return (data.messages || []).reverse(); // oldest first for chat flow
};

export const sendMessage = async (
  accessToken: string, 
  spaceName: string, 
  text: string
): Promise<ChatMessage> => {
  const res = await fetch(`https://chat.googleapis.com/v1/${spaceName}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `خطأ ${res.status}: فشل إرسال الرسالة`;
    throw new Error(message);
  }

  return await res.json();
};

export const createSpace = async (
  accessToken: string, 
  displayName: string
): Promise<ChatSpace> => {
  const res = await fetch('https://chat.googleapis.com/v1/spaces', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      spaceType: 'SPACE',
      displayName
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const message = errorData.error?.message || `خطأ ${res.status}: فشل إنشاء الغرفة`;
    throw new Error(message);
  }

  return await res.json();
};
