const API_ENDPOINT = '/api/job-postings'

export const submitJobPostingApi = async (formData) => {
  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  })

  if (!response.ok) {
    throw new Error('API 요청에 실패했습니다. 서버 상태를 확인해 주세요.')
  }

  return response.json()
}

export const fetchJobPostingsApi = async () => {
  const response = await fetch(API_ENDPOINT)

  if (!response.ok) {
    throw new Error('리스트 조회에 실패했습니다. 서버 상태를 확인해 주세요.')
  }

  const payload = await response.json()
  return payload.map((item) => ({
    id: item.id,
    companyName: item.companyName || item.company || '미정',
    title: item.title,
    postedAt: item.postedAt || item.posted_at || null,
    url: item.url || '',
    notionUrl: item.notionUrl || item.notionURL || '',
    createdAt: item.createdAt || item.created_at || null,
    contentUpdatedAt: item.contentUpdatedAt || item.content_updated_at || null,
    salaryRange: item.salaryRange ?? null,
    workType: item.workType ?? null,
    hybridDaysOnsite: item.hybridDaysOnsite ?? null,
    position: item.position ?? null,
    requiredSkills: item.requiredSkills ?? null,
    preferredSkills: item.preferredSkills ?? null,
    requiredExperience: item.requiredExperience ?? null,
    hiringStatus: item.hiringStatus ?? null,
    atsScore: item.atsScore ?? null,
    atsFeedback: item.atsFeedback ?? null,
    atsUpdatedAt: item.atsUpdatedAt ?? null,
  }))
}

export const triggerAtsApi = async (jobId) => {
  const response = await fetch(`${API_ENDPOINT}/${jobId}/ats`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('ATS 계산에 실패했습니다. 서버 상태를 확인해 주세요.')
  }

  return response.json()
}

export const previewJobPostingApi = async (url) => {
  const response = await fetch(`${API_ENDPOINT}/preview`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    throw new Error('자동 채움 요청에 실패했습니다.')
  }

  return response.json()
}

export const closeJobPostingApi = async (jobId) => {
  const response = await fetch(`${API_ENDPOINT}/${jobId}/close`, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error('채용 종료 처리에 실패했습니다. 서버 상태를 확인해 주세요.')
  }

  return response.json()
}

export const updateJobPostingApi = async (jobId, formData) => {
  const response = await fetch(`${API_ENDPOINT}/${jobId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  })

  if (!response.ok) {
    const message =
      response.status === 409
        ? '이미 등록된 공고와 중복됩니다.'
        : '업데이트에 실패했습니다. 서버 상태를 확인해 주세요.'
    throw new Error(message)
  }

  return response.json()
}
