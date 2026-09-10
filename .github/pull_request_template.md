## 변경 사항

<!-- 무엇을, 왜 바꿨는지 간단히 -->

## 권한/변경요청 관련 코드 리뷰 체크리스트

권한(`domain/permission/permission.policy.ts`, docs/1-domain-definition.md 4장 SSOT) 또는 변경 요청(`change-request`) 관련 로직을 변경한 경우에만 아래를 확인한다(docs/4-project-structure.md 4.3절):

- [ ] 이 모듈(`permission.policy.ts`) 외 다른 계층(presentation/application/infrastructure)에서 권한을 재구현하지 않았는가
- [ ] 변경 요청 승인(`approve-change-request.usecase.ts`)이 `canApproveChangeRequest`를 반드시 경유하는가
- [ ] 신규/변경된 권한 판단 로직에 대응하는 단위 테스트가 있는가
